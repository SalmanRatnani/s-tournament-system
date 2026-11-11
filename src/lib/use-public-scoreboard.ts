"use client";
import {useEffect,useState} from "react";
import type {Match} from "@/lib/types";
import {demoEnabled,getDemoMatches} from "@/lib/demo";
import type {MBBLFixtureSlot} from "@/lib/mbbl/overlay-display";

export type PublicTieGame={
 tie_id:string;game_number:number;score_a:number;score_b:number;
 status:string;category_a:string[];category_b:string[];trump_a:boolean|null;trump_b:boolean|null;
};
export type PublicMBBLTie={
 id:string;fixture_slot_id:string;tournament_id:string;court_id:number;
 team_a_id:string;team_b_id:string;status:string;active_game:number;
 score_a:number;score_b:number;overall_a:number;overall_b:number;
 version:number;updated_at:string;games:PublicTieGame[];
};
export type PublicScoreSnapshot={
 matches:Match[];
 courts:{id:number;youtube_video_id:string|null}[];
 fixtures:MBBLFixtureSlot[];
 teams:{id:string;name:string;tournament_id:string}[];
 players:{id:string;team_id:string;name:string;category:string|null;player_code:string|null;image_url:string|null;image_filename:string|null;is_captain:boolean;is_playing_captain:boolean}[];
 mbblTies:PublicMBBLTie[];
};
const EMPTY:PublicScoreSnapshot={matches:[],courts:[],fixtures:[],teams:[],players:[],mbblTies:[]};
/**
 * One shared HTTP snapshot per spectator tab. No browser Supabase session, no
 * direct Postgres Changes subscription and no per-user database fanout.
 * CDN can coalesce identical requests from thousands of spectators.
 */
export function usePublicScoreboard(refreshMs=5000){
 const [state,setState]=useState<PublicScoreSnapshot>(()=>demoEnabled?{...EMPTY,matches:getDemoMatches()}:EMPTY);
 const [loading,setLoading]=useState(!demoEnabled);
 const [error,setError]=useState("");
 useEffect(()=>{
  if(demoEnabled)return;
  let active=true,busy=false;
  const refresh=async()=>{
   if(busy||document.visibilityState==="hidden")return;
   busy=true;
   try{
    const res=await fetch("/api/public/scoreboard",{cache:"no-store"});
    if(!res.ok)throw Error("Public feed temporarily unavailable");
    const data=(await res.json()) as PublicScoreSnapshot;
    if(active){setState(data);setError("");}
   }catch{if(active)setError("Live updates are temporarily unavailable. Retrying automatically.");}
   finally{busy=false;if(active)setLoading(false);}
  };
  void refresh();
  const timer=window.setInterval(()=>void refresh(),Math.max(3000,refreshMs));
  const visible=()=>{if(document.visibilityState==="visible")void refresh();};
  document.addEventListener("visibilitychange",visible);
  return()=>{active=false;window.clearInterval(timer);document.removeEventListener("visibilitychange",visible);};
 },[refreshMs]);
 return {...state,loading,error};
}
