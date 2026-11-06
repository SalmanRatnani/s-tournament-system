/** Official schedule transcribed from the organiser-supplied MBBL Season 1 poster.
 * Date is not provided in the image. Times are India local (Asia/Kolkata), not UTC.
 * This catalogue is a cross-check for the persisted schedule, NOT scoreable matches.
 */
export type ScheduledPair={court:1|2|3;home:string;away:string};
export type LeagueRound={round:1|2|3|4|5;start:string;end:string;matches:readonly ScheduledPair[]};
export const MBBL_TIMEZONE="Asia/Kolkata";
export const MBBL_LEAGUE_ROUNDS:readonly LeagueRound[]=[
 {round:1,start:"08:30",end:"10:00",matches:[
  {court:1,home:"tsar-strikers",away:"mb-baddy-group"},
  {court:2,home:"supreme-aces",away:"bad-minions"},
  {court:3,home:"shuttle-psychos",away:"asha-smashers"}]},
 {round:2,start:"10:00",end:"11:30",matches:[
  {court:1,home:"tsar-strikers",away:"supreme-aces"},
  {court:2,home:"mb-baddy-group",away:"shuttle-psychos"},
  {court:3,home:"bad-minions",away:"asha-smashers"}]},
 {round:3,start:"11:30",end:"13:00",matches:[
  {court:1,home:"tsar-strikers",away:"bad-minions"},
  {court:2,home:"mb-baddy-group",away:"asha-smashers"},
  {court:3,home:"supreme-aces",away:"shuttle-psychos"}]},
 {round:4,start:"13:30",end:"15:00",matches:[
  {court:1,home:"tsar-strikers",away:"shuttle-psychos"},
  {court:2,home:"mb-baddy-group",away:"bad-minions"},
  {court:3,home:"supreme-aces",away:"asha-smashers"}]},
 {round:5,start:"15:00",end:"16:30",matches:[
  {court:1,home:"tsar-strikers",away:"asha-smashers"},
  {court:2,home:"mb-baddy-group",away:"supreme-aces"},
  {court:3,home:"bad-minions",away:"shuttle-psychos"}]}
] as const;
export const MBBL_NON_MATCH_SCHEDULE=[
 {key:"reporting",time:"07:30",end:null,title:"Player reporting (all teams)"},
 {key:"breakfast",time:"07:30",end:"08:00",title:"Breakfast"},
 {key:"opening",time:"08:00",end:"08:30",title:"Opening ceremony"},
 {key:"lunch",time:"13:00",end:"13:30",title:"Lunch break (30 minutes)"},
 {key:"semifinals",time:"16:30",end:"18:00",title:"Semifinals (rank 1 vs 4 and rank 2 vs 3)"},
 {key:"final",time:"18:00",end:"19:30",title:"Grand Final (winner SF1 vs winner SF2)"},
 {key:"closing",time:"19:30",end:"21:00",title:"Prize distribution & closing ceremony (buffet time)"}
] as const;
export function validateMBBLLeagueRounds(rounds:readonly LeagueRound[],slugs:readonly string[]):string[]{
 const issues:string[]=[];
 const known=new Set(slugs),pairs=new Set<string>();
 if(rounds.length!==5)issues.push("Exactly five league rounds are required");
 for(const round of rounds){
  if(round.matches.length!==3)issues.push("Round "+round.round+" requires three courts");
  const used=new Set<string>(),courts=new Set<number>();
  for(const match of round.matches){
   if(courts.has(match.court))issues.push("Court repeated in round "+round.round);
   courts.add(match.court);
   if(match.home===match.away||!known.has(match.home)||!known.has(match.away))issues.push("Invalid teams in round "+round.round);
   for(const slug of [match.home,match.away]){
    if(used.has(slug))issues.push(slug+" appears twice in round "+round.round);
    used.add(slug);
   }
   const key=[match.home,match.away].sort().join("/");
   if(pairs.has(key))issues.push("Repeat league pairing "+key);
   pairs.add(key);
  }
  if(used.size!==6)issues.push("Round "+round.round+" does not cover all six teams");
  if(round.start>=round.end)issues.push("Round "+round.round+" end time invalid");
 }
 if(pairs.size!==15)issues.push("Exactly 15 unique league ties are required");
 return issues;
}
