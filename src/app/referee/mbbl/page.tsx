"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,CheckCircle2,RefreshCcw,ShieldCheck,Undo2,Wifi} from "lucide-react";
import {Shell,PageHeading} from "@/components/shell";
import {supabaseBrowser} from "@/lib/supabase";
import {mbblGameWinner} from "@/lib/mbbl/rules";
import {sendMBBLCommand,ScoreCommandError,type ScoreCommand} from "@/lib/score-command";

type OfficialTie={id:string;court_id:number;status:string;active_game:number;score_a:number;score_b:number;overall_a:number;overall_b:number;version:number;team_a_id:string;team_b_id:string};
type OfficialGame={tie_id:string;game_number:number;category_a:string[];category_b:string[];score_a:number;score_b:number;status:string;winner:string|null};
type OfficialTeam={id:string;name:string};
type OfficialFeed={ties:OfficialTie[];games:OfficialGame[];teams:OfficialTeam[]};
const EMPTY:OfficialFeed={ties:[],games:[],teams:[]};

export default function MBBLReferee(){
 const [feed,setFeed]=useState<OfficialFeed>(EMPTY),[chosen,setChosen]=useState("");
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [displaySwap,setDisplaySwap]=useState(false);
 const [pending,setPending]=useState<ScoreCommand|null>(null);
 const sending=useRef(false),reading=useRef(false),alive=useRef(false);
 const feedRef=useRef(feed);feedRef.current=feed;
 const fetchOfficial=useCallback(async()=>{
  if(reading.current)return true;
  if(document.visibilityState==="hidden"||!navigator.onLine)return false;
  reading.current=true;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try{
   const db=supabaseBrowser();
   const token=(await db?.auth.getSession())?.data.session?.access_token;
   if(!token)throw Error("Sign in with your assigned staff account");
   const res=await fetch("/api/mbbl/official",{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:controller.signal});
   const body=await res.json();
   if(!res.ok)throw Error(body.error||"Official feed not available");
   if(alive.current)setFeed(old=>{
    const next=body as OfficialFeed;
    const stale=new Set(next.ties.filter(t=>(old.ties.find(o=>o.id===t.id)?.version??-1)>t.version).map(t=>t.id));
    return {...next,ties:next.ties.map(t=>stale.has(t.id)?old.ties.find(o=>o.id===t.id)!:t),
     games:[...next.games.filter(g=>!stale.has(g.tie_id)),...old.games.filter(g=>stale.has(g.tie_id))]};
   });
   if(alive.current)setError("");
   return true;
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:"Unable to read official score");return false;}
  finally{clearTimeout(timeout);reading.current=false;if(alive.current)setLoading(false);}
 },[]);
 useEffect(()=>{
  alive.current=true;
  let stopped=false,failures=0,timer:ReturnType<typeof setTimeout>|undefined;
  const poll=async()=>{
   if(timer)clearTimeout(timer);
   if(stopped||document.visibilityState==="hidden"||!navigator.onLine)return;
   const success=await fetchOfficial();
   failures=success?0:Math.min(failures+1,5);
   const normal=feedRef.current.ties.some(t=>t.status==="live")?2000:10000;
   if(!stopped)timer=setTimeout(()=>void poll(),Math.min(60000,normal*2**failures));
  };
  const resume=()=>{if(timer)clearTimeout(timer);void poll();};
  void poll();
  document.addEventListener("visibilitychange",resume);window.addEventListener("online",resume);window.addEventListener("offline",resume);
  return()=>{stopped=true;alive.current=false;if(timer)clearTimeout(timer);document.removeEventListener("visibilitychange",resume);window.removeEventListener("online",resume);window.removeEventListener("offline",resume);};
 },[fetchOfficial]);
 const match=feed.ties.find(t=>t.id===chosen)||feed.ties[0];
 const game=feed.games.find(g=>g.tie_id===match?.id&&g.game_number===match?.active_game);
 const teamName=(id:string)=>feed.teams.find(t=>t.id===id)?.name||"Unknown team";
 const names=match?[teamName(match.team_a_id),teamName(match.team_b_id)]:["Side A","Side B"];
 const winner=game?mbblGameWinner(game.score_a,game.score_b):null;
 const canScore=Boolean(match?.status==="live"&&game?.status==="live"&&!busy&&!pending);
 async function submit(command:ScoreCommand){
  if(sending.current)return;
  sending.current=true;setBusy(true);setError("");setNotice("");
  try{
   const token=(await supabaseBrowser()?.auth.getSession())?.data.session?.access_token;
   if(!token)throw Error("Your session expired. Sign in again.");
   const result=await sendMBBLCommand(command,token);
   setPending(null);
   setFeed(old=>({
    ...old,
    ties:old.ties.map(t=>t.id===result.tie_id&&t.version<=result.version?{...t,score_a:result.score_a,score_b:result.score_b,version:result.version}:t),
    games:old.games.map(g=>g.tie_id===result.tie_id&&g.game_number===result.game&&(old.ties.find(t=>t.id===g.tie_id)?.version??0)<=result.version?{...g,score_a:result.score_a,score_b:result.score_b}:g)
   }));
   setNotice(result.replayed?"Previous command confirmed; no duplicate point added":command.action==="point"?"Point saved":"Previous point reversed");
  }catch(e){
   if(e instanceof ScoreCommandError&&e.uncertain)setPending(command);
   else if(e instanceof ScoreCommandError)setPending(null);
   await fetchOfficial();
   setError(e instanceof Error?e.message:"Score rejected");
  }finally{sending.current=false;setBusy(false);}
 }
 async function score(side:"a"|"b",action:"point"|"undo"="point"){
  if(!match||!game||sending.current||pending||!canScore||(action==="point"&&winner))return;
  await submit({tieId:match.id,game:game.game_number,side,action,expectedVersion:match.version,requestId:crypto.randomUUID()});
 }
 const sides=displaySwap?([{id:"b" as const,label:names[1]},{id:"a" as const,label:names[0]}]):([{id:"a" as const,label:names[0]},{id:"b" as const,label:names[1]}]);
 return <Shell title="MBBL REFEREE"><div className="content animate-in">
  <PageHeading eyebrow="MBBL SEASON 1 · AUTHORISED OFFICIALS" title="Nine-game referee console" subtitle="Authenticated scoring for assigned team ties. Every point is validated and recorded by the database." actions={<Link className="btn" href="/referee"><ArrowLeft size={15}/> Standard referee console</Link>}/>
  <div className="callout" style={{marginBottom:18}}><ShieldCheck size={19}/> <span>Points are accepted only for a prepared, live MBBL game with a 15-point target and a two-point winning margin. At 14–14 play continues; there is no golden point or sudden-death cap.</span></div>
  {error&&<div className="error" role="alert">{error}</div>}
  {pending&&<div className="callout" role="alert">A previous command needs confirmation. <button className="btn" disabled={busy} onClick={()=>void submit(pending)}>Retry previous command</button></div>}
  {notice&&<div className="callout" role="status" style={{marginBottom:13}}><CheckCircle2 size={17}/>{notice}</div>}
  <div className="panel panel-pad" style={{marginBottom:18}}>
   <div className="row between wrap"><strong>Official match assignment</strong><button className="btn" type="button" onClick={()=>void fetchOfficial()} disabled={busy}><RefreshCcw size={15}/> Refresh</button></div>
   {loading?<p className="help-note" style={{marginTop:14}}>Checking assigned matches…</p>:feed.ties.length?
    <label className="field" style={{marginTop:16}}>Select court / tie<select className="input" disabled={busy||Boolean(pending)} value={match?.id||""} onChange={e=>{setChosen(e.target.value);setDisplaySwap(false);setNotice("");}}>
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
    <button type="button" className="btn btn-primary" disabled={!canScore||Boolean(winner)} onClick={()=>void score(side.id)}>+1 POINT</button>
    <button type="button" className="btn" disabled={!canScore} onClick={()=>void score(side.id,"undo")}><Undo2 size={15}/> Undo last point</button>
   </div>)}</div>
   {winner&&<p className="callout" role="status">Game won by {names[winner==="a"?0:1]}. The Main Controller can confirm the final. Undo remains available for a correction.</p>}
   <div className="mbbl-live-overall"><strong>Overall team points</strong><div>{match.overall_a} <span>:</span> {match.overall_b}</div></div>
   <div className="row between wrap" style={{marginTop:17}}><span className="help-note">Version {match.version} · Changes synchronize across phones</span><button type="button" className="btn" onClick={()=>setDisplaySwap(v=>!v)}><ArrowRight size={14}/> Swap visual sides</button></div>
   {match.status!=="live"&&<p className="help-note" style={{marginTop:15}}>Standby: only the Main Controller can start a validated game. Scores cannot be modified in this state.</p>}
  </div>}
  <p className="help-note" style={{marginTop:20}}><Wifi size={14} style={{verticalAlign:"middle"}}/> Saved points appear immediately after server confirmation. Live games refresh every two seconds. If a response is lost, retry the same command using the confirmation button; do not enter the point again.</p>
 </div></Shell>;
}
