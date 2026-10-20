/** Tournament-configurable rally scoring; targets 11–30, hard cap 30, best of 1 or 3. */
export type GameRules = {best_of:1|3;winning_score:number;win_by_two:boolean;point_cap:number};
export const DEFAULT_GAME_RULES:GameRules={best_of:3,winning_score:21,win_by_two:true,point_cap:30};
export function validateGameRules(raw:unknown):GameRules {
 if(!raw||typeof raw!=="object")throw Error("Missing scoring rules");
 const r=raw as Record<string,unknown>;
 if(r.best_of!==1&&r.best_of!==3)throw Error("Sets must be 1 or best of 3");
 if(!Number.isInteger(r.winning_score)||(r.winning_score as number)<11||(r.winning_score as number)>30)throw Error("Points per set must be between 11 and 30");
 if(typeof r.win_by_two!=="boolean")throw Error("Specify whether deuce/advantage is enabled");
 if(!Number.isInteger(r.point_cap)||(r.point_cap as number)<(r.winning_score as number)||(r.point_cap as number)>30)throw Error("Maximum points must be between target and 30");
 return r as GameRules;
}
export function didGameEnd(a:number,b:number,r:GameRules):boolean{
 if(Math.max(a,b)>=r.point_cap)return true;
 if(Math.max(a,b)<r.winning_score)return false;
 return !r.win_by_two || Math.abs(a-b)>=2;
}
export function awardRally(score:{a:number;b:number},side:"a"|"b",r:GameRules){
 validateGameRules(r);
 if(didGameEnd(score.a,score.b,r))throw Error("This game has already ended");
 const next={...score,[side]:score[side]+1};
 if(next.a>r.point_cap||next.b>r.point_cap)throw Error("Point cap exceeded");
 return {score:next,gameOver:didGameEnd(next.a,next.b,r),winner:didGameEnd(next.a,next.b,r)?(next.a>next.b?"a":"b"):null};
}
