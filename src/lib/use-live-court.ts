"use client";
import {useEffect,useState} from "react";
import {demoEnabled,getDemoMatches} from "./demo";
import {supabaseBrowser} from "./supabase";
import type {Match} from "./types";

/** Keeps each public court page/OBS overlay scoped to its court instead of the full fixture history. */
const statusOrder:Record<Match["status"],number>={live:0,paused:1,scheduled:2,completed:3};
function currentMatch(matches:Match[],court:number):Match|undefined{
 return matches.filter(m=>m.court_id===court&&m.kind!=="team_tie")
  .sort((a,b)=>statusOrder[a.status]-statusOrder[b.status]||Date.parse(b.updated_at)-Date.parse(a.updated_at))[0];
}
export function useLiveCourt(court:number){
 const [match,setMatch]=useState<Match|undefined>(()=>demoEnabled?currentMatch(getDemoMatches(),court):undefined);
 const [loading,setLoading]=useState(!demoEnabled);
 const [error,setError]=useState("");
 useEffect(()=>{
  const valid=Number.isInteger(court)&&court>=1&&court<=3;
  if(!valid){setMatch(undefined);setLoading(false);return;}
  if(demoEnabled){
   const refresh=()=>setMatch(currentMatch(getDemoMatches(),court));
   refresh();
   const broadcast=typeof BroadcastChannel!=="undefined"?new BroadcastChannel("s-tournament-demo"):null;
   const onStorage=(event:StorageEvent)=>{if(event.key?.startsWith("s-tournament-demo"))refresh();};
   window.addEventListener("storage",onStorage);
   window.addEventListener("demo-score-change",refresh);
   broadcast?.addEventListener("message",refresh);
   return()=>{window.removeEventListener("storage",onStorage);window.removeEventListener("demo-score-change",refresh);broadcast?.close();};
  }
  const db=supabaseBrowser();
  if(!db){setLoading(false);setError("Tournament database not configured");return;}
  let mounted=true;
  let revision=0;
  setMatch(undefined);
  setLoading(true);
  const refresh=async()=>{
   const request=++revision;
   const {data,error:loadError}=await db.from("matches").select("*")
    .eq("court_id",court).neq("kind","team_tie").order("updated_at",{ascending:false}).limit(100);
   if(!mounted||request!==revision)return;
   if(loadError){setError("Court scores are temporarily unavailable.");}
   else{setMatch(currentMatch((data||[]) as Match[],court));setError("");}
   setLoading(false);
  };
  void refresh();
  const channel=db.channel("public-score-court-"+court)
   .on("postgres_changes",{event:"*",schema:"public",table:"matches",filter:"court_id=eq."+court},()=>{void refresh();})
   .subscribe();
  // Recover if a websocket update was missed; one court's matches only.
  const reconciliation=window.setInterval(()=>{void refresh();},30000);
  return()=>{mounted=false;window.clearInterval(reconciliation);void db.removeChannel(channel);};
 },[court]);
 return {match,loading,error};
}
