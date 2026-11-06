"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {AlertTriangle,BookOpen,CheckCircle2,ChevronRight,ShieldCheck,Trophy,Users} from "lucide-react";
import {Organizer} from "@/components/organizer";
import {MBBL_TEAMS,MBBL_CATEGORY_ORDER,type MBBLCategory} from "@/lib/mbbl/catalog";
import {CATEGORY_GROUPS,computeTiePoints,validateNinePairs,validateTrumpSelections,TRUMP_COUNTS,REPLACEMENTS,type CompletedGame,type Side,type Stage,type PairSelection} from "@/lib/mbbl/rules";

const DEFAULT_PAIRS:Readonly<Record<number,readonly [MBBLCategory,MBBLCategory]>>={
 1:["A+","A1"],2:["A2","A3"],3:["B1","B2"],4:["B3","B4"],5:["C1","C2"],6:["C3","C4"],
 7:["K1","K2"],8:["W1","W2"],9:["G1","B5"]
};
const startingPairs=()=>Object.fromEntries(CATEGORY_GROUPS.map(g=>[g.number,[...DEFAULT_PAIRS[g.number]]])) as Record<number,[MBBLCategory,MBBLCategory]>;
type Scores=Record<number,{a:string;b:string;walkover:""|"a"|"b"}>;
export default function MBBLAdmin(){
 const [home,setHome]=useState(0),[away,setAway]=useState(1);
 const [stage,setStage]=useState<Stage>("league");
 const [pairs,setPairs]=useState<{a:Record<number,[MBBLCategory,MBBLCategory]>;b:Record<number,[MBBLCategory,MBBLCategory]>}>({a:startingPairs(),b:startingPairs()});
 const [trumps,setTrumps]=useState<{a:number[];b:number[]}>({a:[],b:[]});
 const [scores,setScores]=useState<Scores>({});
 const [penalties,setPenalties]=useState({a:0,b:0});
 const name=(side:Side,category:MBBLCategory)=>MBBL_TEAMS[side==="a"?home:away].players.find(p=>p.category===category)?.name||category;
 const setPair=(side:Side,game:number,index:0|1,value:MBBLCategory)=>setPairs(p=>({...p,[side]:{...p[side],[game]:p[side][game].map((v,i)=>i===index?value:v) as [MBBLCategory,MBBLCategory]}}));
 const toggleTrump=(side:Side,game:number)=>setTrumps(p=>({...p,[side]:p[side].includes(game)?p[side].filter(n=>n!==game):p[side].length<TRUMP_COUNTS[stage]?[...p[side],game].sort():p[side]}));
 const updateScore=(game:number,key:"a"|"b"|"walkover",value:string)=>setScores(s=>({...s,[game]:{a:s[game]?.a??"",b:s[game]?.b??"",walkover:s[game]?.walkover??"",[key]:value}} as Scores));
 const pairErrors=useMemo(()=>({
  a:validateNinePairs(CATEGORY_GROUPS.map(g=>({game:g.number,categories:pairs.a[g.number]} as PairSelection))),
  b:validateNinePairs(CATEGORY_GROUPS.map(g=>({game:g.number,categories:pairs.b[g.number]} as PairSelection)))
 }),[pairs]);
 const gameResults=useMemo(()=>{
  const games:CompletedGame[]=[];const issues:string[]=[];
  for(const g of CATEGORY_GROUPS){
   const x=scores[g.number];if(!x||(!x.a&&!x.b&&!x.walkover))continue;
   if(x.walkover){games.push({number:g.number,scoreA:x.walkover==="a"?7:15,scoreB:x.walkover==="b"?7:15,trumpA:trumps.a.includes(g.number),trumpB:trumps.b.includes(g.number),walkoverBy:x.walkover});continue;}
   const a=Number(x.a),b=Number(x.b);
   if(!x.a||!x.b||!Number.isInteger(a)||!Number.isInteger(b)||Math.min(a,b)<0||a===b||Math.max(a,b)!==15){issues.push("Game "+g.number+" must have a clear 15-point winner.");continue;}
   games.push({number:g.number,scoreA:a,scoreB:b,trumpA:trumps.a.includes(g.number),trumpB:trumps.b.includes(g.number)});
  }
  try{const summary=computeTiePoints(games,[...Array(penalties.a)].map(()=>({side:"a" as Side,reason:"Illustrative umpire penalty",amount:1 as const})),...Array(penalties.b)].map(()=>({side:"b" as Side,reason:"Illustrative umpire penalty",amount:1 as const})));return {games,issues,summary};}
  catch(e){return {games,issues:[...issues,e instanceof Error?e.message:"Cannot calculate"],summary:null};}
 },[scores,trumps,penalties]);
 const teamA=MBBL_TEAMS[home],teamB=MBBL_TEAMS[away];
 const changeStage=(value:Stage)=>{setStage(value);setTrumps({a:[],b:[]});setScores({});setPenalties({a:0,b:0});};
 const allValid=pairErrors.a.length===0&&pairErrors.b.length===0&&validateTrumpSelections(stage,trumps.a).length===0&&validateTrumpSelections(stage,trumps.b).length===0;
 return <Organizer title="MBBL Season 1 · Match desk" subtitle="Nine category-locked doubles games, independent Trump picks, tie points and relay preparation.">
 {({data})=><>
  <div className="callout mbbl-warning"><AlertTriangle size={21}/><div><strong>Rules-driven planning interface — no live scoring or fixture writes yet.</strong><p className="help-note">The original five-rubber workflow is incompatible with MBBL and blocked at the server. This desk previews the official lineups and scoring calculations; an authorised, audited nine-game workflow must be activated before officials start matches.</p></div></div>
  <div className="grid cols-3" style={{margin:"17px 0"}}><div className="panel stat"><div className="stat-label">Teams registered</div><div className="stat-value">{data?.teams.length??0}/6</div></div><div className="panel stat"><div className="stat-label">Players registered</div><div className="stat-value">{data?.players.length??0}/108</div></div><div className="panel stat"><div className="stat-label">Rulebook profile</div><div className="stat-value" style={{fontSize:20}}>MBBL S1</div><div className="stat-sub">9 games × 15 points</div></div></div>
  <section className="panel panel-pad"><div className="row between wrap"><div><div className="eyebrow">GAME PLAN</div><h2 className="section-title">Set up a tie</h2></div><Link href="/mbbl" className="btn"><BookOpen size={15}/> Public rosters <ChevronRight size={14}/></Link></div>
   <div className="grid cols-3" style={{marginTop:17}}>
    <label className="field">Team A<select className="input" value={home} onChange={e=>{const v=Number(e.target.value);setHome(v);if(v===away)setAway((v+1)%6)}}>{MBBL_TEAMS.map((t,i)=><option value={i} key={t.slug}>{t.name}</option>)}</select></label>
    <label className="field">Team B<select className="input" value={away} onChange={e=>{const v=Number(e.target.value);setAway(v);if(v===home)setHome((v+1)%6)}}>{MBBL_TEAMS.map((t,i)=><option value={i} key={t.slug}>{t.name}</option>)}</select></label>
    <label className="field">Stage<select className="input" value={stage} onChange={e=>changeStage(e.target.value as Stage)}><option value="league">League — 3 Trump selections</option><option value="semifinal">Semifinal — 2 Trump selections</option><option value="final">Final — 1 Trump selection</option></select></label>
   </div>
   <p className="help-note">Selections are not transmitted or stored. The owner/captain must privately confirm both sides' actual lineups and Trump choices before a tie begins.</p>
  </section>
  <section className="panel panel-pad" style={{marginTop:17}}><div className="row between wrap"><div><div className="eyebrow">MANDATORY ORDER</div><h2 className="section-title">Nine doubles pair selections</h2></div><span className={"badge "+(pairErrors.a.length+pairErrors.b.length===0?"live":"scheduled")}>{pairErrors.a.length+pairErrors.b.length===0?"VALID CATEGORY SELECTIONS":"CATEGORY CONFLICT"}</span></div>
   <div className="mbbl-lineup-grid">{CATEGORY_GROUPS.map(g=><div className="mbbl-lineup-row" key={g.number}><div className="mbbl-game-heading"><span className="mbbl-game-number">{String(g.number).padStart(2,"0")}</span><div><strong>{g.group} category</strong><small>{g.description}</small></div></div>
    {(["a","b"] as Side[]).map(side=><div className="mbbl-pair-entry" key={side}><div className="mbbl-pair-side">{side==="a"?teamA.name:teamB.name}</div><div className="mbbl-pair-pickers">{([0,1] as const).map(index=><label key={index}><span className="sr-only">Game {g.number} {side} player {index+1}</span><select className="input" value={pairs[side][g.number][index]} onChange={e=>setPair(side,g.number,index,e.target.value as MBBLCategory)}>{MBBL_CATEGORY_ORDER.map(c=><option key={c} value={c}>{c} · {name(side,c)}</option>)}</select></label>)}</div>
      <button type="button" className={"btn mbbl-trump-btn"+(trumps[side].includes(g.number)?" btn-primary":"")} onClick={()=>toggleTrump(side,g.number)} aria-pressed={trumps[side].includes(g.number)} title={trumps[side].includes(g.number)?"Remove Trump":trumps[side].length>=TRUMP_COUNTS[stage]?"Maximum Trump Games selected":"Designate as Trump"}>{trumps[side].includes(g.number)?"★ TRUMP":"☆ Trump"}</button></div>)}
   </div>)}</div>
   <div className="grid cols-2" style={{marginTop:17}}>{(["a","b"] as Side[]).map(side=><div key={side}><strong>{side==="a"?teamA.name:teamB.name}</strong><p className="help-note">{trumps[side].length}/{TRUMP_COUNTS[stage]} Trump Games picked</p>{pairErrors[side].map(e=><p key={e} className="help-note" style={{color:"#ffc68d"}}>⚠ {e}</p>)}{validateTrumpSelections(stage,trumps[side]).map(e=><p key={e} className="help-note" style={{color:"#ffc68d"}}>⚠ {e}</p>)}</div>)}</div>
  </section>
  <section className="panel panel-pad" style={{marginTop:17}}><div className="eyebrow">RULE CALCULATOR · SANDBOX</div><h2 className="section-title">Test Trump scoring and walkovers</h2><p className="help-note">Enter an illustrative completed 15-point game score or choose the forfeiting team for a 15–7 walkover. A game's Trump selection affects only the side that chose it.</p>
   <div className="panel table-wrap"><table className="table mbbl-score-table"><thead><tr><th>Game</th><th>{teamA.name}</th><th>{teamB.name}</th><th>Walkover by</th></tr></thead><tbody>{CATEGORY_GROUPS.map(g=><tr key={g.number}><td><strong>{g.number}</strong>{trumps.a.includes(g.number)&&<small className="mbbl-trump-mark"> A★</small>}{trumps.b.includes(g.number)&&<small className="mbbl-trump-mark"> B★</small>}</td>{(["a","b"] as Side[]).map(side=><td key={side}><label><span className="sr-only">Game {g.number} team {side} rally score</span><input className="input mbbl-score-input" type="number" min={0} max={15} value={scores[g.number]?.[side]??""} disabled={Boolean(scores[g.number]?.walkover)} placeholder="—" onChange={e=>updateScore(g.number,side,e.target.value)}/></label></td>)}<td><select className="input" value={scores[g.number]?.walkover??""} onChange={e=>updateScore(g.number,"walkover",e.target.value)} aria-label={"Game "+g.number+" walkover by"}><option value="">No walkover</option><option value="a">{teamA.name}</option><option value="b">{teamB.name}</option></select></td></tr>)}</tbody></table></div>
   <div className="grid cols-2" style={{marginTop:17}}>{(["a","b"] as Side[]).map(side=><div key={side} className="mbbl-penalty-control"><strong>{side==="a"?teamA.name:teamB.name}</strong><p className="help-note">Illustrative umpire penalties (−1 overall point each)</p><div className="row wrap"><button className="btn" type="button" disabled={penalties[side]===0} onClick={()=>setPenalties(p=>({...p,[side]:p[side]-1}))}>−</button><strong>{penalties[side]}</strong><button className="btn" type="button" disabled={penalties[side]>=9} onClick={()=>setPenalties(p=>({...p,[side]:p[side]+1}))}>+</button></div></div>)}</div>
   {gameResults.issues.map((m,i)=><p className="help-note" style={{color:"#ffc68d"}} key={i}>⚠ {m}</p>)}
   <div className="mbbl-result-preview"><div><span className="eyebrow">OVERALL TIE POINTS</span><div className="mbbl-preview-score">{gameResults.summary?.a??"—"} <span>:</span> {gameResults.summary?.b??"—"}</div><p>{teamA.name} vs {teamB.name}</p></div><div><span className="eyebrow">COMPLETED GAMES</span><strong>{gameResults.games.length}/9</strong><p>{gameResults.games.length===9?gameResults.summary?.requiresRelay&&stage!=="league"?"KNOCKOUT RELAY REQUIRED":gameResults.summary?.winner?"Team "+gameResults.summary.winner.toUpperCase()+" leads on overall points":"League tie total level":"Match simulation in progress"}</p></div></div>
   <p className="help-note">No live match scores are updated by this calculator. Knockout ties equal after all nine games require a three-stage relay at 10, 20 and 30 cumulative points; league table ties use a separate Best vs Best game.</p>
  </section>
  <section className="panel panel-pad" style={{marginTop:17}}><div className="eyebrow">PRE-EVENT CONTROL</div><h2 className="section-title">Official rule exceptions</h2><div className="grid cols-2"><div><h3>Player substitution rules</h3><div className="mbbl-rule-pills">{Object.entries(REPLACEMENTS).map(([c,repls])=><span key={c}>{c} → {repls?.join(" / ")}</span>)}</div></div><div><h3>Relay progression</h3><p className="subline">A pair to 10 points → B pair to 20 → C pair to 30. Scores carry forward; no player may appear twice in the relay.</p><h3>Discipline and walkovers</h3><p className="subline">K/W/G nonattendance is a 15–7 walkover. No −1 Trump loss deduction applies to the forfeiting side. Organiser-authorised penalties deduct one overall point each.</p></div></div></section>
  <p className="help-note" style={{marginTop:17}}><ShieldCheck size={14} style={{verticalAlign:"middle"}}/> Scoring to 15, but the source does not explicitly state how 14–14 extensions are handled. The live referee workflow must not be activated until this is confirmed.</p>
 </>}</Organizer>;
}
