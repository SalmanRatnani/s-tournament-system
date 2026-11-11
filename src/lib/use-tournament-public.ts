"use client";
import {useEffect,useState} from "react";
import {usePublicScoreboard} from "./use-public-scoreboard";
import {demoEnabled} from "./demo";
import {roundRobin,DEFAULT_TEAM_NAMES,type TournamentTeam,type TeamTie} from "./tournament";
import type {RosterPlayer} from "./use-organizer";
const demoTeams:TournamentTeam[]=DEFAULT_TEAM_NAMES.map((name,i)=>({id:"demo-team-"+(i+1),name}));
const demoTies:TeamTie[]=roundRobin(demoTeams.map(t=>t.id)).map((v,i)=>({
 id:"demo-tie-"+i,team_a_id:v.a,team_b_id:v.b,round:"LEAGUE "+v.round,
 court_id:v.court,status:"scheduled",winner:null,score_a:0,score_b:0,
 side_a:demoTeams.find(t=>t.id===v.a)!.name,side_b:demoTeams.find(t=>t.id===v.b)!.name
}));
export function useTournamentPublic(){
 const feed=usePublicScoreboard(12000);
 if(demoEnabled)return {teams:demoTeams,players:[] as RosterPlayer[],ties:demoTies,loading:false,error:"",demo:true};
 return {
  teams:feed.teams as TournamentTeam[],
  players:feed.players as RosterPlayer[],
  ties:feed.matches.filter(m=>m.kind==="team_tie") as unknown as TeamTie[],
  loading:feed.loading,error:feed.error,demo:false
 };
}
