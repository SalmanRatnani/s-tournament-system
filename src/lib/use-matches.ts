"use client";
import { useEffect,useState } from "react";
import { demoEnabled,getDemoMatches } from "./demo";
import type { Match } from "./types";
import {supabaseBrowser} from "./supabase";
export function useMatches(){
 const [matches,setMatches]=useState<Match[]>(getDemoMatches);
 const [loading,setLoading]=useState(!demoEnabled);
 const [error,setError]=useState("");
 useEffect(()=>{
  if(demoEnabled){const update=()=>setMatches([...getDemoMatches()]);update();
   const channel=typeof BroadcastChannel!=="undefined"?new BroadcastChannel("s-tournament-demo"):null;
   const onStorage=(e:StorageEvent)=>{if(e.key?.startsWith("s-tournament-demo"))update();};
   window.addEventListener("storage",onStorage);window.addEventListener("demo-score-change",update);
   channel?.addEventListener("message",update);
   const onLocal=()=>channel?.postMessage("updated");window.addEventListener("demo-score-change",onLocal);
   return()=>{window.removeEventListener("storage",onStorage);window.removeEventListener("demo-score-change",update);window.removeEventListener("demo-score-change",onLocal);channel?.close();};
  }
  const db=supabaseBrowser();if(!db)return;
  let alive=true;
  const refresh=async()=>{const {data,error}=await db.from("matches").select("*").order("court_id",{ascending:true});if(alive){if(error)setError(error.message);else{setMatches(data as Match[]);setError("");}setLoading(false);}};
  void refresh();
  const channel=db.channel("public-match-updates").on("postgres_changes",{event:"*",schema:"public",table:"matches"},()=>{void refresh();}).subscribe();
  // Periodic reconciliation if a realtime message is missed or connection is interrupted.
  const timer=window.setInterval(()=>{void refresh();},15000);
  return()=>{alive=false;clearInterval(timer);void db.removeChannel(channel);};
 },[]);
 return {matches,loading,error,refreshDemo:()=>setMatches([...getDemoMatches()])};
}
export function useCourt(court:number){const x=useMatches();return {...x,match:x.matches.filter(m=>m.court_id===court&&m.kind!=="team_tie").sort((a,b)=>(a.status==="live"?0:a.status==="paused"?1:2)-(b.status==="live"?0:b.status==="paused"?1:2))[0]};}
