"use client";
import {useMemo} from "react";
import {demoEnabled,getDemoMatches} from "./demo";
import {usePublicScoreboard} from "./use-public-scoreboard";
import type {Match} from "./types";
const order:Record<Match["status"],number>={live:0,paused:1,scheduled:2,completed:3};
export function useLiveCourt(court:number){
 const feed=usePublicScoreboard();
 const match=useMemo(()=> (demoEnabled?getDemoMatches():feed.matches)
   .filter(m=>m.court_id===court&&m.kind!=="team_tie")
   .sort((a,b)=>order[a.status]-order[b.status]||Date.parse(b.updated_at)-Date.parse(a.updated_at))[0],[court,feed.matches]);
 return {match,loading:feed.loading,error:feed.error};
}
