"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {AlertTriangle,ArrowLeft,CheckCircle2,FileCheck2,LockKeyhole,ShieldCheck} from "lucide-react";
import {Organizer} from "@/components/organizer";
import {usePublicScoreboard} from "@/lib/use-public-scoreboard";
import {MBBL_CATEGORY_ORDER,type MBBLCategory} from "@/lib/mbbl/catalog";
import {CATEGORY_GROUPS,validateNinePairs,validateTrumpSelections,type PairSelection} from "@/lib/mbbl/rules";
import {supabaseBrowser} from "@/lib/supabase";

type Entry={game:number;a:[MBBLCategory,MBBLCategory];b:[MBBLCategory,MBBLCategory]};
const initial:Entry[]=([
 ["A+","A1"],["A2","A3"],["B1","B2"],["B3","B4"],["C1","C2"],
 ["C3","C4"],["K1","K2"],["W1","W2"],["G1","B5"]
] as [MBBLCategory,MBBLCategory][]).map((pair,i)=>({game:i+1,a:[...pair],b:[...pair]}));
export default function MBBLPrepare(){
 const feed=usePublicScoreboard(15000);
 const fixtures=feed.fixtures.filter(f=>f.stage==="league"&&f.team_a_id&&f.team_b_id).sort((a,b)=>Number(a.round_no)-Number(b.round_no)||Number(a.court_id)-Number(b.court_id));
 const [fixtureId,setFixtureId]=useState(""),[entries,setEntries]=useState<Entry[]>(initial);
 const [trumpA,setTrumpA]=useState<number[]>([]),[trumpB,setTrumpB]=useState<number[]>([]);
 const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const fixture=fixtures.find(f=>f.id===fixtureId)||fixtures[0];
 const teamName=(id:string|null)=>feed.teams.find(t=>t.id===id)?.name||"Unassigned";
 const playerName=(teamId:string|null,c:MBBLCategory)=>feed.players.find(p=>p.team_id===teamId&&p.category===c)?.name||c;
 const issues=useMemo(()=>[
  ...validateNinePairs(entries.map(e=>({game:e.game,categories:e.a} as PairSelection))),
  ...validateNinePairs(entries.map(e=>({game:e.game,categories:e.b} as PairSelection))),
  ...validateTrumpSelections("league",trumpA),
  ...validateTrumpSelections("league",trumpB)
 ],[entries,trumpA,trumpB]);
 const updatePair=(game:number,side:"a"|"b",pos:0|1,category:MBBLCategory)=>{
  setEntries(v=>v.map(e=>e.game!==game?e:{...e,[side]:e[side].map((x,i)=>i===pos?category:x) as [MBBLCategory,MBBLCategory]}));
  setConfirmed(false);setSuccess("");
 };
 const toggleTrump=(side:"a"|"b",number:number)=>{
  const setter=side==="a"?setTrumpA:setTrumpB;
  setter(arr=>arr.includes(number)?arr.filter(n=>n!==number):arr.length<3?[...arr,number].sort((a,b)=>a-b):arr);
  setConfirmed(false);setSuccess("");
 };
 async function save(){
  if(!fixture||issues.length||!confirmed||busy)return;
  setBusy(true);setError("");setSuccess("");
  try{
   const db=supabaseBrowser();const session=(await db?.auth.getSession())?.data.session;
   if(!session)throw Error("Main Controller sign-in required");
   const res=await fetch("/api/admin/mbbl/ties",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},
    body:JSON.stringify({fixtureId:fixture.id,pairs:entries,trumpA,trumpB})});
   const data=await res.json();
   if(!res.ok)throw Error(data.error||"Could not prepare team tie");
   setSuccess("Official tie saved. It remains in READY state—scoring is still blocked until rules are confirmed.");
   setConfirmed(false);
  }catch(e){setError(e instanceof Error?e.message:"Unable to prepare game");}
  finally{setBusy(false);}
 }
 return <Organizer title="MBBL · Official match preparation" subtitle="Verify all nine pairings and independent Trump selections for an actual published league tie.">
 {()=><>
  <div className="callout" style={{marginBottom:18}}><LockKeyhole size={18}/> Private owner workflow. Selecting a fixture does not start it. Do not reveal either team's unplayed Trump selections to spectators.</div>
  <div className="panel panel-pad">
   <div className="row between wrap"><div><div className="eyebrow">LEAGUE FIXTURE</div><h2 className="section-title">Prepare an official nine-game tie</h2></div><Link className="btn" href="/admin/mbbl"><ArrowLeft size={15}/> Back to match desk</Link></div>
   <label className="field" style={{marginTop:16}}>Published court fixture<select className="input" value={fixture?.id||""} onChange={e=>{setFixtureId(e.target.value);setConfirmed(false);setSuccess("");}}>
    {fixtures.map(f=><option key={f.id} value={f.id}>Round {f.round_no} · Court {f.court_id}: {teamName(f.team_a_id)} vs {teamName(f.team_b_id)}</option>)}
   </select></label>
   {feed.error&&<div className="error" role="alert">{feed.error}</div>}
   <p className="help-note">The teams and court come from the official fixture schedule. No dates or matches are generated here.</p>
   {fixture&&<div className="mbbl-prep-grid">
    <div className="mbbl-prep-heading"><span>Game & category</span><span>{teamName(fixture.team_a_id)}</span><span>{teamName(fixture.team_b_id)}</span></div>
    {CATEGORY_GROUPS.map(group=>{
     const entry=entries[group.number-1];
     return <div key={group.number} className="mbbl-prep-row">
      <div><strong>GAME {group.number}</strong><p>{group.description}</p></div>
      {(["a","b"] as const).map(side=><div className="mbbl-prep-pair" key={side}>
       {[0,1].map(i=><select key={i} className="input" aria-label={"Game "+group.number+" team "+side+" player "+(i+1)}
        value={entry[side][i]} onChange={e=>updatePair(group.number,side,i as 0|1,e.target.value as MBBLCategory)}>
         {MBBL_CATEGORY_ORDER.map(category=><option key={category} value={category}>{category} · {playerName(side==="a"?fixture.team_a_id:fixture.team_b_id,category)}</option>)}
       </select>)}
       <button type="button" aria-pressed={(side==="a"?trumpA:trumpB).includes(group.number)} className={"btn "+((side==="a"?trumpA:trumpB).includes(group.number)?"btn-primary":"")}
        onClick={()=>toggleTrump(side,group.number)}> {(side==="a"?trumpA:trumpB).includes(group.number)?"★ TRUMP":"☆ Mark Trump"}</button>
      </div>)}
     </div>;
    })}
   </div>}
   <div className="mbbl-prep-check"><span>{trumpA.length}/3 Trump games for Team A</span><span>{trumpB.length}/3 Trump games for Team B</span></div>
   {issues.length>0?<div className="error" role="alert">Resolve before saving: {issues[0]}</div>:<div className="callout"><CheckCircle2 size={18}/> Category pairings and Trump counts are valid. Confirm actual lineups with each team before saving.</div>}
   {error&&<div className="error" role="alert">{error}</div>}
   {success&&<div className="callout" role="status"><CheckCircle2 size={17}/>{success}</div>}
   <label className="mbbl-prep-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I have verified both teams' nine actual pairings and all Trump selections with the authorised organisers.</span></label>
   <button className="btn btn-primary" disabled={!fixture||issues.length>0||!confirmed||busy} onClick={()=>void save()}>
    <FileCheck2 size={17}/> {busy?"Saving approved tie…":"Save official tie as READY"}
   </button>
   <p className="help-note" style={{marginTop:14}}>Saving is permanent without an approved amendment workflow. This stage does not activate scoring, calculate outcomes, assign referees or overwrite completed fixtures.</p>
  </div>
 </>}</Organizer>;
}
