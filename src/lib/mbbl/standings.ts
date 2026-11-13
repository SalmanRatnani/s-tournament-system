import {compareLeagueRows} from "./rules";
import type {MBBLFixtureSlot} from "./overlay-display";

type Team={id:string;name:string;tournament_id?:string|null};
type Tie={id:string;fixture_slot_id:string;tournament_id:string;team_a_id:string;team_b_id:string;status:string;overall_a:number;overall_b:number;games:{game_number:number;score_a:number;score_b:number;status:string}[]};
export type MBBLStanding={teamId:string;teamName:string;tournamentId:string;played:number;gamesPlayed:number;totalPoints:number;gamesWon:number;rallyDifference:number;rank:number;tied:boolean;qualified:boolean};
export type MBBLStandings={rows:MBBLStanding[];leagueComplete:boolean;hasResults:boolean;completedTies:number;scheduledTies:number};

/** Official overall totals already include Trump awards/deductions and penalties.
 * Only confirmed games contribute wins/rally difference. Live rallies never do.
 * Equal ranking keys share a rank; alphabetical display order cannot break a tie.
 */
export function calculateMBBLStandings(teams:readonly Team[],fixtures:readonly MBBLFixtureSlot[],ties:readonly Tie[]):MBBLStandings{
 const league=fixtures.filter(f=>f.stage==="league"&&f.status!=="cancelled");
 const tournamentIds=new Set(league.map(f=>f.tournament_id));
 const rows=new Map<string,MBBLStanding>(teams.filter(t=>t.tournament_id&&tournamentIds.has(t.tournament_id)).map(t=>[t.id,{
  teamId:t.id,teamName:t.name,tournamentId:t.tournament_id!,played:0,gamesPlayed:0,totalPoints:0,gamesWon:0,rallyDifference:0,rank:0,tied:false,qualified:false
 }]));
 const byFixture=new Map(league.map(f=>[f.id,f]));
 const seen=new Set<string>();let completedTies=0,hasResults=false;
 for(const tie of ties){
  const fixture=byFixture.get(tie.fixture_slot_id);
  if(!fixture||seen.has(fixture.id)||fixture.tournament_id!==tie.tournament_id||fixture.team_a_id!==tie.team_a_id||fixture.team_b_id!==tie.team_b_id)continue;
  const a=rows.get(tie.team_a_id),b=rows.get(tie.team_b_id);
  if(!a||!b)continue;
  seen.add(fixture.id);
  if(tie.status==="completed"){a.played++;b.played++;completedTies++;hasResults=true;}
  a.totalPoints+=tie.overall_a;b.totalPoints+=tie.overall_b;
  if(tie.overall_a!==0||tie.overall_b!==0)hasResults=true;
  const games=new Set<number>();
  for(const g of tie.games){
   if(!["completed","walkover"].includes(g.status)||games.has(g.game_number)||g.game_number<1||g.game_number>9)continue;
   games.add(g.game_number);hasResults=true;a.gamesPlayed++;b.gamesPlayed++;
   a.gamesWon+=Number(g.score_a>g.score_b);b.gamesWon+=Number(g.score_b>g.score_a);
   a.rallyDifference+=g.score_a-g.score_b;b.rallyDifference+=g.score_b-g.score_a;
  }
 }
 const result=[...rows.values()].sort((a,b)=>compareLeagueRows(a,b)||a.teamName.localeCompare(b.teamName));
 // MBBL S1 has precisely 15 league ties. Never seed from a partial timetable.
 const leagueComplete=league.length===15&&completedTies===15&&result.length===6&&tournamentIds.size===1;
 for(let start=0;start<result.length;){
  let end=start+1;while(end<result.length&&compareLeagueRows(result[start],result[end])===0)end++;
  for(let i=start;i<end;i++){result[i].rank=start+1;result[i].tied=end-start>1;result[i].qualified=leagueComplete&&end<=4;}
  start=end;
 }
 return {rows:result,leagueComplete,hasResults,completedTies,scheduledTies:league.length};
}
