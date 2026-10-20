"use client";
import {useEffect,useState} from "react";
import {supabaseBrowser} from "@/lib/supabase";
import {demoEnabled} from "@/lib/demo";
import {roundRobin,DEFAULT_TEAM_NAMES,type TournamentTeam,type TeamTie} from "@/lib/tournament";
import type {RosterPlayer} from "@/lib/use-organizer";
const exampleTeams:TournamentTeam[]=DEFAULT_TEAM_NAMES.map((name,n)=>({id:`demo-team-${n+1}`,name}));
const examples:TeamTie[]=roundRobin(exampleTeams.map(t=>t.id)).map((v,i)=>({id:`demo-tie-${i}`,team_a_id:v.a,team_b_id:v.b,round:`LEAGUE ${v.round}`,court_id:v.court,status:"scheduled",winner:null,score_a:0,score_b:0,side_a:exampleTeams.find(t=>t.id===v.a)!.name,side_b:exampleTeams.find(t=>t.id===v.b)!.name}));
export function useTournamentPublic(){const [teams,setTeams]=useState<TournamentTeam[]>(demoEnabled?exampleTeams:[]);const [players,setPlayers]=useState<RosterPlayer[]>([]);const [ties,setTies]=useState<TeamTie[]>(demoEnabled?examples:[]);const [loading,setLoading]=useState(!demoEnabled);const [error,setError]=useState("");
 useEffect(()=>{if(demoEnabled)return;const db=supabaseBrowser();if(!db)return;let alive=true;const fetchData=async()=>{const [t,p,m]=await Promise.all([db.from("teams").select("id,name,tournament_id"),db.from("players").select("id,team_id,name,player_code,category,image_url,image_filename,auction_amount,is_captain,is_playing_captain"),db.from("matches").select("id,team_a_id,team_b_id,round,court_id,side_a,side_b,status,winner,score_a,score_b").eq("kind","team_tie")]);if(!alive)return;const err=t.error||p.error||m.error;if(err)setError(err.message);else{setTeams(t.data||[]);setPlayers(p.data||[]);setTies((m.data||[]) as TeamTie[]);setError("");}setLoading(false);};void fetchData();const channel=db.channel("public-tie-events").on("postgres_changes",{schema:"public",table:"matches",event:"*"},()=>{void fetchData()}).subscribe();const timer=setInterval(()=>{void fetchData()},30000);return()=>{alive=false;clearInterval(timer);void db.removeChannel(channel);};},[]);
 return {teams,players,ties,loading,error,demo:demoEnabled};}
