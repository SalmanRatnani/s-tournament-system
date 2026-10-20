import type { GameRules } from "./scoring-rules";
export type Status = "scheduled" | "live" | "paused" | "completed";
export type MatchKind = "singles" | "doubles" | "team_tie";
export type Score = {a:number;b:number};
export type Match = {
 id:string; court_id:number; tournament_id:string; round:string; kind:MatchKind;
 side_a:string; side_b:string; status:Status;
 score_a:number; score_b:number; games:Score[]; current_game:number;
 best_of:GameRules["best_of"]; winning_score:number; win_by_two:boolean; point_cap:number;
 winner:"a"|"b"|null; version:number; updated_at:string;
 youtube_video_id?:string|null;
};
export type Court = {id:number; name:string};
export type ScoringAction = "point"|"undo";
export const courtNames=["Court 01","Court 02","Court 03"] as const;
export function gamesWon(m:Match, side:"a"|"b"){return m.games.filter(g=>g[side]>g[side==="a"?"b":"a"]).length;}
export function matchScore(m:Match){return `${gamesWon(m,"a")} – ${gamesWon(m,"b")}`;}
export function gameLabel(m:Match){return m.status==="completed"?"FINAL":`GAME ${m.current_game}`;}
