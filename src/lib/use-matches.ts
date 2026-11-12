"use client";
import {useEffect,useState} from "react";
import {demoEnabled,getDemoMatches} from "./demo";
import {usePublicScoreboard} from "./use-public-scoreboard";
import {supabaseBrowser} from "./supabase";
import type {Match} from "./types";

/** Spectators should use the shared CDN feed, not one Supabase websocket per viewer. */
export function useMatches(){
 const publicFeed=usePublicScoreboard();
 const [demoMatches,setDemoMatches]=useState<Match[]>(getDemoMatches);
 useEffect(()=>{
  if(!demoEnabled)return;
  const update=()=>setDemoMatches([...getDemoMatches()]);
  const channel=typeof BroadcastChannel!=="undefined"?new BroadcastChannel("s-tournament-demo"):null;
  const onStorage=(e:StorageEvent)=>{if(e.key?.startsWith("s-tournament-demo"))update();};
  window.addEventListener("storage",onStorage);
  window.addEventListener("demo-score-change",update);
  channel?.addEventListener("message",update);
  return()=>{window.removeEventListener("storage",onStorage);window.removeEventListener("demo-score-change",update);channel?.close();};
 },[]);
 return {matches:demoEnabled?demoMatches:publicFeed.matches,loading:publicFeed.loading,error:publicFeed.error,refresh:publicFeed.refresh,refreshDemo:()=>setDemoMatches([...getDemoMatches()])};
}
/** Referees have few connections and need immediate authenticated score updates. */
export function useOfficialMatches(){
 const [matches,setMatches]=useState<Match[]>(()=>demoEnabled?getDemoMatches():[]);
 const [loading,setLoading]=useState(!demoEnabled);
 const [error,setError]=useState("");
 useEffect(()=>{
  if(demoEnabled)return;
  const db=supabaseBrowser();if(!db){setLoading(false);setError("Tournament connection missing");return;}
  let mounted=true;
  const refresh=async()=>{
   const {data,error:e}=await db.from("matches").select("*").order("court_id");
   if(!mounted)return;
   if(e)setError("Official score feed unavailable");else{setMatches((data||[]) as Match[]);setError("");}
   setLoading(false);
  };
  void refresh();
  const channel=db.channel("official-match-update").on("postgres_changes",{schema:"public",table:"matches",event:"*"},()=>void refresh()).subscribe();
  const timer=setInterval(()=>void refresh(),12000);
  return()=>{mounted=false;clearInterval(timer);void db.removeChannel(channel);};
 },[]);
 return {matches,loading,error};
}
export function useCourt(court:number){
 const data=useMatches();
 return {...data,match:data.matches.filter(m=>m.court_id===court&&m.kind!=="team_tie").sort((a,b)=>(a.status==="live"?0:a.status==="paused"?1:2)-(b.status==="live"?0:b.status==="paused"?1:2))[0]};
}
