export type TournamentTeam={id:string; name:string; tournament_id?:string};
export type TeamTie={id:string;team_a_id:string;team_b_id:string;round:string;status:string;winner:"a"|"b"|null;score_a:number;score_b:number;court_id:number;side_a:string;side_b:string};
export type Ranking={team:TournamentTeam;played:number;wins:number;losses:number;rubbersFor:number;rubbersAgainst:number;points:number;difference:number};
export const LEAGUE_ROUNDS=5;
export const ROSTER_SIZE=18;
export const TEAM_COUNT=6;
export const RUBBERS_PER_TIE=5;
export const DEFAULT_TEAM_NAMES=["Team 01","Team 02","Team 03","Team 04","Team 05","Team 06"];
export function roundRobin(ids:string[]){
 if(ids.length!==6 || new Set(ids).size!==6) throw Error("Exactly six unique teams required");
 const rotation=[...ids];const out:{round:number;a:string;b:string;court:number}[]=[];
 for(let round=1;round<=5;round++){
  for(let court=1;court<=3;court++){
   const a=rotation[court-1],b=rotation[6-court];
   // Rotate home/away for reasonably balanced assignments.
   out.push({round,a:round%2===1?a:b,b:round%2===1?b:a,court});
  }
  rotation.splice(1,0,rotation.pop()!);
 }
 return out;
}
export function calculateStandings(teams:TournamentTeam[],ties:TeamTie[]):Ranking[]{
 const rows=new Map(teams.map(t=>[t.id,{team:t,played:0,wins:0,losses:0,rubbersFor:0,rubbersAgainst:0,points:0,difference:0}]));
 for(const t of ties){if(t.round?.startsWith("LEAGUE")&&t.status==="completed"&&t.winner){const a=rows.get(t.team_a_id),b=rows.get(t.team_b_id);if(!a||!b)continue;
 a.played++;b.played++;a.rubbersFor+=t.score_a;a.rubbersAgainst+=t.score_b;b.rubbersFor+=t.score_b;b.rubbersAgainst+=t.score_a;
 if(t.winner==="a"){a.wins++;b.losses++;a.points+=2;}else{b.wins++;a.losses++;b.points+=2;}
 }}
 return [...rows.values()].map(r=>({...r,difference:r.rubbersFor-r.rubbersAgainst})).sort((a,b)=>b.points-a.points||b.difference-a.difference||b.rubbersFor-a.rubbersFor||a.team.name.localeCompare(b.team.name));
}
export function leagueIsComplete(ties:TeamTie[]){return ties.filter(t=>t.round.startsWith("LEAGUE")).length===15&&ties.filter(t=>t.round.startsWith("LEAGUE")).every(t=>t.status==="completed"&&t.winner);}
export function semifinalSeeds(ranked:Ranking[]){if(ranked.length!==6)throw Error("Exactly six teams are needed");return [[ranked[0].team,ranked[3].team],[ranked[1].team,ranked[2].team]] as const;}
