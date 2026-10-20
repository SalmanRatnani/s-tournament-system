import {didGameEnd} from "./scoring-rules";
import type { Match, ScoringAction, Status } from "./types";
export const demoEnabled = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const initial: Match[] = [
 {id:"demo-1",court_id:1,tournament_id:"demo",round:"MEN'S SINGLES • QUARTERFINAL",kind:"singles",side_a:"Arjun Mehta",side_b:"Rohan Shah",status:"live",score_a:18,score_b:16,games:[{a:21,b:17}],current_game:2,best_of:3,winning_score:21,win_by_two:true,point_cap:30,winner:null,version:12,updated_at:new Date().toISOString()},
 {id:"demo-2",court_id:2,tournament_id:"demo",round:"WOMEN'S DOUBLES • SEMIFINAL",kind:"doubles",side_a:"Ananya / Priya",side_b:"Sara / Riya",status:"live",score_a:12,score_b:14,games:[],current_game:1,best_of:3,winning_score:21,win_by_two:true,point_cap:30,winner:null,version:7,updated_at:new Date().toISOString()},
 {id:"demo-3",court_id:3,tournament_id:"demo",round:"TEAM EVENT • RUBBER 2",kind:"singles",side_a:"Falcons • Kabir",side_b:"Titans • Vivaan",status:"live",score_a:9,score_b:10,games:[{a:19,b:21}],current_game:2,best_of:3,winning_score:21,win_by_two:true,point_cap:30,winner:null,version:9,updated_at:new Date().toISOString()}
];
const STORAGE="s-tournament-demo-matches-v1"; const HISTORY="s-tournament-demo-history-v1";
export function getDemoMatches():Match[]{if(typeof window==="undefined")return initial;try { const value=localStorage.getItem(STORAGE);if(value){const m=JSON.parse(value) as Match[];if(Array.isArray(m)&&m.length===3)return m;}}catch{}return initial;}
function commit(matches:Match[]){localStorage.setItem(STORAGE,JSON.stringify(matches));window.dispatchEvent(new Event("demo-score-change"));}
export function resetDemo(){if(typeof window==="undefined")return;localStorage.removeItem(HISTORY);commit(initial.map(m=>({...m,updated_at:new Date().toISOString()})));}
// Demo-only local state, NOT shared between actual referee phones. Production uses atomic SQL RPC.
export function changeDemoScore(court:number, side:"a"|"b",action:ScoringAction="point"){
 const matches=getDemoMatches(); const i=matches.findIndex(m=>m.court_id===court);if(i<0)return;
 const m=matches[i];let histories:Record<string,Match[]>={};try{histories=JSON.parse(localStorage.getItem(HISTORY)||"{}");}catch{}
 if(action==="undo") {const previous=histories[m.id]?.pop();if(!previous)return;matches[i]={...previous,version:m.version+1,updated_at:new Date().toISOString()};}
 else {if(m.status!=="live")return;histories[m.id]=[...(histories[m.id]||[]),structuredClone(m)];
 const next={...m,games:[...m.games],score_a:m.score_a+(side==="a"?1:0),score_b:m.score_b+(side==="b"?1:0),version:m.version+1,updated_at:new Date().toISOString()};
 const a=next.score_a,b=next.score_b;
 const ended=didGameEnd(a,b,next);
 if(ended){next.games=[...next.games,{a,b}];const winsA=next.games.filter(x=>x.a>x.b).length;const winsB=next.games.filter(x=>x.b>x.a).length;
 if(Math.max(winsA,winsB)>=Math.ceil(next.best_of/2)){next.status="completed";next.winner=winsA>winsB?"a":"b";}
 else {next.current_game++;next.score_a=0;next.score_b=0;}}
 matches[i]=next;}
 localStorage.setItem(HISTORY,JSON.stringify(histories));commit(matches);
}
export function setDemoStatus(court:number,status:Status){const all=getDemoMatches();const m=all.find(x=>x.court_id===court);if(!m||m.status==="completed")return;m.status=status;m.updated_at=new Date().toISOString();m.version++;commit(all);}
