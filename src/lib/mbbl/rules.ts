/** Pure rules for MBBL Season 1, as written in the user-supplied official rulebook (7 pages).
 * No implicit BWF deuce extension: this rulebook specifies 15-point single games
 * but does not specify an explicit 14-all extension or cap. Operators must confirm
 * this condition before automated rally scoring is activated.
 */
import {MBBL_CATEGORY_ORDER,type MBBLCategory,type MBBLPlayer} from "./catalog";
export type Side="a"|"b";
export type Stage="league"|"semifinal"|"final";
export type CategoryGroup="A"|"B"|"C"|"K/W"|"G+B";
export const CATEGORY_GROUPS:{number:number;group:CategoryGroup;description:string}[]=[
 {number:1,group:"A",description:"A+ + one other A player"},
 {number:2,group:"A",description:"Remaining two A players"},
 {number:3,group:"B",description:"B1 + one other B player"},
 {number:4,group:"B",description:"Two of the remaining B players"},
 {number:5,group:"C",description:"C1 + one other C player"},
 {number:6,group:"C",description:"Remaining two C players"},
 {number:7,group:"K/W",description:"K1 + K2 or one W player"},
 {number:8,group:"K/W",description:"Remaining two eligible K/W players"},
 {number:9,group:"G+B",description:"G1 + remaining B player"}
];
export const REQUIRED_CATEGORY_COUNTS={A:4,B:5,C:4,K:2,W:2,G:1} as const;
export const TRUMP_COUNTS:Record<Stage,number>={league:3,semifinal:2,final:1};
export const REPLACEMENTS:Partial<Record<MBBLCategory,readonly MBBLCategory[]>>={
 "A+":["A3","B1"],A1:["B1","B2"],A2:["B2","B3"],A3:["B3","B4"],
 B1:["B5","C1"],B2:["C1","C2"],B3:["C2","C3"],B4:["C3","C4"],B5:["C4","G1"]
};
export const WALKOVER_SCORE={winner:15,loser:7} as const;
export const RELAY_THRESHOLDS=[10,20,30] as const;
export function categoryFamily(category:string):keyof typeof REQUIRED_CATEGORY_COUNTS{
 if(category.startsWith("A"))return "A";
 if(category.startsWith("B"))return "B";
 if(category.startsWith("C"))return "C";
 if(category.startsWith("K"))return "K";
 if(category.startsWith("W"))return "W";
 return "G";
}
export function validateRoster(players:readonly MBBLPlayer[]):string[]{
 const issues:string[]=[];
 const known=new Set(MBBL_CATEGORY_ORDER);
 const seen=new Set<string>();
 for(const p of players){
  if(!known.has(p.category))issues.push("Unknown player category "+p.category);
  if(seen.has(p.category))issues.push("Duplicate player category "+p.category);
  seen.add(p.category);
  if(!p.name.trim())issues.push("Player name missing for "+p.category);
 }
 for(const category of MBBL_CATEGORY_ORDER)if(!seen.has(category))issues.push("Missing "+category);
 if(players.length!==18)issues.push("Expected 18 players, received "+players.length);
 return issues;
}
export function allowedPair(game:number,pair:readonly [MBBLCategory,MBBLCategory]):boolean{
 const [a,b]=pair;const set=[a,b];const f=(x:MBBLCategory)=>categoryFamily(x);
 switch(game){
  case 1:return set.includes("A+")&&set.every(x=>f(x)==="A");
  case 2:return set.every(x=>f(x)==="A")&&!set.includes("A+");
  case 3:return set.includes("B1")&&set.every(x=>f(x)==="B");
  case 4:return set.every(x=>f(x)==="B")&&!set.includes("B1");
  case 5:return set.includes("C1")&&set.every(x=>f(x)==="C");
  case 6:return set.every(x=>f(x)==="C")&&!set.includes("C1");
  case 7:return set.includes("K1")&&set.every(x=>f(x)==="K"||f(x)==="W")&&set.some(x=>x!=="K1");
  case 8:return set.every(x=>["K","W"].includes(f(x)))&&!set.includes("K1");
  case 9:return set.includes("G1")&&set.some(x=>f(x)==="B");
  default:return false;
 }
}
export type PairSelection={game:number;categories:readonly [MBBLCategory,MBBLCategory]};
export function validateNinePairs(pairs:readonly PairSelection[],exemptions:readonly MBBLCategory[]=[]):string[]{
 const issues:string[]=[];
 if(pairs.length!==9)issues.push("Nine compulsory doubles games are required");
 const used=new Set<MBBLCategory>(), numbers=new Set<number>(), exempt=new Set(exemptions);
 for(const p of pairs){
  if(numbers.has(p.game))issues.push("Repeated game number "+p.game);
  numbers.add(p.game);
  if(!allowedPair(p.game,p.categories))issues.push("Game "+p.game+" has an invalid category pair");
  for(const c of p.categories){
   if(used.has(c)&&!exempt.has(c))issues.push(c+" plays twice without an authorised replacement");
   used.add(c);
  }
 }
 for(let n=1;n<=9;n++)if(!numbers.has(n))issues.push("Missing game "+n);
 return issues;
}
export function validateTrumpSelections(stage:Stage,selected:readonly number[]):string[]{
 const issues:string[]=[];
 if(selected.length!==TRUMP_COUNTS[stage])issues.push(stage+" requires "+TRUMP_COUNTS[stage]+" Trump games per team");
 if(new Set(selected).size!==selected.length)issues.push("Duplicate Trump game");
 if(selected.some(n=>!Number.isInteger(n)||n<1||n>9))issues.push("Trump games must be numbered 1–9");
 return issues;
}
export type CompletedGame={number:number;scoreA:number;scoreB:number;trumpA:boolean;trumpB:boolean;walkoverBy?:Side|null};
export type DisciplinePenalty={side:Side;reason:string;amount:1};
export function computeTiePoints(games:readonly CompletedGame[],penalties:readonly DisciplinePenalty[]=[]){
 let a=0,b=0,winsA=0,winsB=0,rallyA=0,rallyB=0;
 const used=new Set<number>();
 for(const game of games){
  if(!Number.isInteger(game.number)||game.number<1||game.number>9||used.has(game.number))throw Error("Invalid or duplicate game number");
  used.add(game.number);
  if(!Number.isInteger(game.scoreA)||!Number.isInteger(game.scoreB)||game.scoreA<0||game.scoreB<0||game.scoreA===game.scoreB)throw Error("Completed games need distinct nonnegative integer scores");
  if(game.walkoverBy){
   if(game.walkoverBy==="a"&&(game.scoreA!==7||game.scoreB!==15))throw Error("Walkover A must be 7–15");
   if(game.walkoverBy==="b"&&(game.scoreA!==15||game.scoreB!==7))throw Error("Walkover B must be 15–7");
  }
  rallyA+=game.scoreA;rallyB+=game.scoreB;
  if(game.scoreA>game.scoreB){winsA++;a+=game.trumpA?2:1;if(game.trumpB&&game.walkoverBy!=="b")b--;}
  else{winsB++;b+=game.trumpB?2:1;if(game.trumpA&&game.walkoverBy!=="a")a--;}
 }
 for(const p of penalties){if(p.amount!==1||!p.reason.trim())throw Error("Penalty requires approved reason and value");if(p.side==="a")a--;else b--;}
 return {a,b,gamesWonA:winsA,gamesWonB:winsB,rallyPointsA:rallyA,rallyPointsB:rallyB,
  winner:a===b?null:(a>b?"a":"b") as Side,
  requiresRelay:games.length===9&&a===b};
}
export type LeagueRow={teamId:string;totalPoints:number;gamesWon:number;rallyDifference:number};
export function compareLeagueRows(a:LeagueRow,b:LeagueRow){
 return b.totalPoints-a.totalPoints||b.gamesWon-a.gamesWon||b.rallyDifference-a.rallyDifference;
}
export function relayStage(scoreA:number,scoreB:number):0|1|2|3{
 const leading=Math.max(scoreA,scoreB);
 return leading>=30?3:leading>=20?2:leading>=10?1:0;
}
