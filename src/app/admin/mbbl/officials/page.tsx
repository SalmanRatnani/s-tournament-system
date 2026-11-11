"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft,CheckCircle2,RefreshCcw,ShieldCheck,UserRoundCheck} from "lucide-react";
import {Organizer} from "@/components/organizer";
import {supabaseBrowser} from "@/lib/supabase";
type Tie={id:string;court_id:number;team_a_id:string;team_b_id:string;status:string;active_game:number;version:number;score_a:number;score_b:number;overall_a:number;overall_b:number};
type Profile={id:string;display_name:string;role:string};
type Assignment={tie_id:string;user_id:string};
type Team={id:string;name:string};
type Data={ties:Tie[];referees:Profile[];assignments:Assignment[];teams:Team[]};
const empty:Data={ties:[],referees:[],assignments:[],teams:[]};
export default function MBBLRefereeAssignment(){
 const [data,setData]=useState<Data>(empty),[busy,setBusy]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const reload=useCallback(async()=>{
  try{
   const db=supabaseBrowser(),token=(await db?.auth.getSession())?.data.session?.access_token;
   if(!token)throw Error("Main Controller sign-in required");
   const res=await fetch("/api/admin/mbbl/assignments",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
   const body=await res.json();
   if(!res.ok)throw Error(body.error||"Unable to load assignments");
   setData(body as Data);setError("");
  }catch(e){setError(e instanceof Error?e.message:"Unable to load official assignments");}
 },[]);
 useEffect(()=>{void reload();},[reload]);
 async function change(tieId:string,userId:string,remove:boolean){
  const key=tieId+"-"+userId;setBusy(key);setNotice("");setError("");
  try{
   const db=supabaseBrowser(),token=(await db?.auth.getSession())?.data.session?.access_token;
   if(!token)throw Error("Session expired");
   const res=await fetch("/api/admin/mbbl/assignments",{method:"POST",
    headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
    body:JSON.stringify({tieId,userId,remove})});
   const body=await res.json();
   if(!res.ok)throw Error(body.error||"Assignment rejected");
   setNotice(remove?"Referee access revoked":"Referee assigned to selected tie");
   await reload();
  }catch(e){setError(e instanceof Error?e.message:"Assignment not saved");}
  finally{setBusy("");}
 }
 async function control(tie:Tie,action:"start"|"pause"|"finish"){
  const key=tie.id+"-control";setBusy(key);setError("");setNotice("");
  try{
   const db=supabaseBrowser(),token=(await db?.auth.getSession())?.data.session?.access_token;
   if(!token)throw Error("Owner session expired");
   const res=await fetch("/api/admin/mbbl/control",{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({tieId:tie.id,action,expectedVersion:tie.version})});
   const body=await res.json();
   if(!res.ok)throw Error(body.error||"Match control rejected");
   setNotice("Official game status updated: "+body.tie.status);
   await reload();
  }catch(e){setError(e instanceof Error?e.message:"Game control failed");await reload();}
  finally{setBusy("");}
 }
 const team=(id:string)=>data.teams.find(t=>t.id===id)?.name||"Unknown team";
 return <Organizer title="MBBL · Referee assignments" subtitle="Give each approved referee access only to their assigned official team ties.">
 {()=><div className="panel panel-pad">
  <div className="row between wrap" style={{marginBottom:22}}><div><div className="eyebrow">MATCH OFFICIAL ACCESS</div><h2 className="section-title">Authorise three court officials</h2></div><div className="row wrap"><Link href="/admin/mbbl/prepare" className="btn"><ArrowLeft size={15}/> Prepare a tie</Link><button className="btn" onClick={()=>void reload()}><RefreshCcw size={14}/> Refresh</button></div></div>
  <div className="callout" style={{marginBottom:16}}><ShieldCheck size={18}/> Assigning a referee does not start gameplay. Start, pause and finalise controls require Main Controller access and an officially confirmed scoring rule.</div>
  {error&&<div className="error" role="alert">{error}</div>}
  {notice&&<div className="callout" role="status"><CheckCircle2 size={16}/>{notice}</div>}
  {!data.referees.length&&<div className="callout">No verified referee roles exist yet. Approve staff under <Link href="/admin/users" style={{textDecoration:"underline"}}>Referee accounts</Link> first.</div>}
  {!data.ties.length?<div className="panel empty">No official MBBL ties have been prepared. Save a league lineup on the preparation page first.</div>:
   <div className="mbbl-ref-assignment-list">{data.ties.map(t=><article className="mbbl-ref-assign-row" key={t.id}>
    <div><span className="eyebrow">COURT {String(t.court_id).padStart(2,"0")} · {t.status.toUpperCase()}</span><h3>{team(t.team_a_id)} vs {team(t.team_b_id)}</h3><p className="help-note">Current game {t.active_game}/9 · Score {t.score_a}–{t.score_b} · Overall {t.overall_a}–{t.overall_b}</p><div className="row wrap" style={{marginTop:10}}>{(t.status==="ready"||t.status==="paused")&&<button type="button" className="btn btn-primary" disabled={Boolean(busy)} onClick={()=>void control(t,"start")}>Start / resume official game</button>}{t.status==="live"&&<><button type="button" className="btn" disabled={Boolean(busy)} onClick={()=>void control(t,"pause")}>Pause game</button><button type="button" className="btn btn-primary" disabled={Boolean(busy)} onClick={()=>void control(t,"finish")}>Confirm game final</button></>}</div></div>
    <div className="mbbl-ref-buttons">{data.referees.map(ref=>{
     const enabled=data.assignments.some(a=>a.tie_id===t.id&&a.user_id===ref.id);
     return <button type="button" key={ref.id} className={"btn "+(enabled?"btn-primary":"")}
      disabled={Boolean(busy)} aria-pressed={enabled} onClick={()=>void change(t.id,ref.id,enabled)}>
      <UserRoundCheck size={15}/>{ref.display_name||"Referee"} · {enabled?"Assigned":"Assign"}
     </button>;
    })}</div>
   </article>)}</div>}
  <p className="help-note" style={{marginTop:19}}>For operational safety, schedule officials by tie—not just by court. The same device may be reused for a different court only after an explicit new assignment.</p>
 </div>}</Organizer>;
}
