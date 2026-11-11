"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,CheckCircle2,RefreshCcw,ShieldCheck,Undo2,Wifi,WifiOff} from "lucide-react";
import {Shell,PageHeading} from "@/components/shell";
import {supabaseBrowser} from "@/lib/supabase";

type OfficialTie={id:string;court_id:number;status:string;active_game:number;score_a:number;score_b:number;overall_a:number;overall_b:number;version:number;team_a_id:string;team_b_id:string};
type OfficialGame={tie_id:string;game_number:number;category_a:string[];category_b:string[];score_a:number;score_b:number;status:string;winner:string|null};
type OfficialTeam={id:string;name:string};
type OfficialFeed={ties:OfficialTie[];games:OfficialGame[];teams:OfficialTeam[]};
const EMPTY:OfficialFeed={ties:[],games:[],teams:[]};

export default function MBBLReferee(){
 const [feed,setFeed]=useState<OfficialFeed>(EMPTY),[chosen,setChosen]=useState("");
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [displaySwap,setDisplaySwap]=useState(false);
 const fetchOfficial=useCallback(async()=>{
  const db=supabaseBrowser();if(!db){setError("Tournament connection not configured");setLoading(false);return;}
  const token=(await db.auth.getSession()).data.session?.access_token;
  if(!token){setError("Sign in with your assigned staff account");setLoading(false);return;}
  try{
   const res=await fetch("/api/mbbl/official",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
   const body=await res.json();
   if(!res.ok)throw Error(body.error||"Official feed not available");
   setFeed(body as OfficialFeed);setError("");
  }catch(e){setError(e instanceof Error?e.message:"Unable to read official score");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{
  void fetchOfficial();
  const timer=setInterval(()=>void fetchOfficial(),5000);
  return()=>clearInterval(timer);
 },[fetchOfficial]);
 const match=feed.ties.find(t=>t.id===chosen)||feed.ties[0];
 const game=feed.games.find(g=>g.tie_id===match?.id&&g.game_number===match?.active_game);
 const teamName=(id:string)=>feed.teams.find(t=>t.id===id)?.name||"Unknown team";
 const names=match?[teamName(match.team_a_id),teamName(match.team_b_id)]:["Side A","Side B"];
 const canScore=Boolean(match?.status==="live"&&game?.status==="live"&&!busy);
 async function score(side:"a"|"b",action:"point"|"undo"="point"){
  if(!match||!game||busy)return;
  setBusy(true);setError("");setNotice("");
  try{
   const db=supabaseBrowser();const token=(await db?.auth.getSession())?.data.session?.access_token;
   if(!token)throw Error("Your session expired. Sign in again.");
   const res=await fetch("/api/mbbl/score",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
    body:JSON.stringify({tieId:match.id,game:game.game_number,side,action,expectedVersion:match.version,requestId:crypto.randomUUID()})
   });
   const body=await res.json();
   if(!res.ok)throw Error(body.error||"Point was not saved");
   setNotice(action==="point"?"Point saved to official audit history":"Previous point reversed");
   await fetchOfficial();
  }catch(e){setError(e instanceof Error?e.message:"Score rejected");await fetchOfficial();}
  finally{setBusy(false);}
 }
 const sides=displaySwap?([{id:"b" as const,label:names[1]},{id:"a" as const,label:names[0]}]):([{id:"a" as const,label:names[0]},{id:"b" as const,label:names[1]}]);
 return <Shell title="MBBL REFEREE"><div className="content animate-in">
  <PageHeading eyebrow="MBBL SEASON 1 · AUTHORISED OFFICIALS" title="Nine-game referee console" subtitle="Authenticated scoring for assigned team ties. Every point is validated and recorded by the database." actions={<Link className="btn" href="/referee"><ArrowLeft size={15}/> Standard referee console</Link>}/>
  <div className="callout" style={{marginBottom:18}}><ShieldCheck size={19}/> <span>Points are accepted only for a prepared, live MBBL game after its official scoring rule has been confirmed. Pending ties and games cannot be scored.</span></div>
  {error&&<div className="error" role="alert">{error}</div>}
  {notice&&<div className="callout" role="status" style={{marginBottom:13}}><CheckCircle2 size={17}/>{notice}</div>}
  <div className="panel panel-pad" style={{marginBottom:18}}>
   <div className="row between wrap"><strong>Official match assignment</strong><button className="btn" type="button" onClick={()=>void fetchOfficial()} disabled={busy}><RefreshCcw size={15}/> Refresh</button></div>
   {loading?<p className="help-note" style={{marginTop:14}}>Checking assigned matches…</p>:feed.ties.length?
    <label className="field" style={{marginTop:16}}>Select court / tie<select className="input" value={match?.id||""} onChange={e=>{setChosen(e.target.value);setDisplaySwap(false);setNotice("");}}>
     {feed.ties.map(t=><option key={t.id} value={t.id}>Court {t.court_id} · {teamName(t.team_a_id)} vs {teamName(t.team_b_id)} · {t.status.toUpperCase()}</option>)}
    </select></label>:
    <p className="help-note" style={{marginTop:14}}>No MBBL team ties assigned yet. The Main Controller must prepare and assign matches; this page will not create fixtures automatically.</p>}
  </div>
  {match&&<div className="panel panel-pad mbbl-live-console">
   <div className="row between wrap"><div><div className="eyebrow">COURT {String(match.court_id).padStart(2,"0")} · MBBL S1</div><h2 className="section-title">GAME {match.active_game} / 9</h2></div><span className={"badge "+(match.status==="live"?"live":"scheduled")}>{match.status.toUpperCase()}</span></div>
   {game?<p className="help-note">Category pair: {game.category_a.join(" + ")} vs {game.category_b.join(" + ")}</p>:<p className="help-note">This game has not been prepared by the Main Controller.</p>}
   <div className="mbbl-live-score-grid">{sides.map(side=><div key={side.id} className="mbbl-live-score-side">
    <div className="eyebrow">TEAM {side.id.toUpperCase()}</div><strong className="mbbl-live-team">{side.label}</strong>
    <div className="mbbl-live-score">{side.id==="a"?match.score_a:match.score_b}</div>
    <button type="button" className="btn btn-primary" disabled={!canScore} onClick={()=>void score(side.id)}>+1 POINT</button>
    <button type="button" className="btn" disabled={!canScore} onClick={()=>void score(side.id,"undo")}><Undo2 size={15}/> Undo last point</button>
   </div>)}</div>
   <div className="mbbl-live-overall"><strong>Overall team points</strong><div>{match.overall_a} <span>:</span> {match.overall_b}</div></div>
   <div className="row between wrap" style={{marginTop:17}}><span className="help-note">Version {match.version} · Changes synchronize across phones</span><button type="button" className="btn" onClick={()=>setDisplaySwap(v=>!v)}><ArrowRight size={14}/> Swap visual sides</button></div>
   {match.status!=="live"&&<p className="help-note" style={{marginTop:15}}>Standby: only the Main Controller can start a validated game. Scores cannot be modified in this state.</p>}
  </div>}
  <p className="help-note" style={{marginTop:20}}><Wifi size={14} style={{verticalAlign:"middle"}}/> This console refreshes every five seconds; only successful database writes count as official points. If connection is lost, do not repeatedly tap without checking the refreshed score.</p>
 </div></Shell>;
}
