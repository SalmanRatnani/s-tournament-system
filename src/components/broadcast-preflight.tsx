"use client";
import {useState} from "react";
import Link from "next/link";
import {ArrowRight,Camera,Check,CheckCircle2,ClipboardCheck,ExternalLink,MonitorPlay,Radio,RotateCcw,ShieldCheck,Video,Youtube} from "lucide-react";
import type {CourtStream} from "@/lib/use-court-streams";
import {youtubeWatchUrl} from "@/lib/youtube";

const PREFLIGHT=[
 {label:"Camera picture and audio reach OBS",tip:"Use a USB capture device or a private VDO.Ninja view link as a Browser Source. Test fast movement and verify the picture remains stable."},
 {label:"Private court score overlay is visible",tip:"Generate the signed Court overlay below, add it as a separate OBS Browser Source at 1920 × 1080, and position it above the camera."},
 {label:"OBS encoder reaches YouTube Live Control Room",tip:"Create an UNLISTED encoder livestream. Enter the stream key in OBS only; confirm YouTube reports an incoming signal."},
 {label:"Unlisted YouTube playback and site embed tested",tip:"Open the saved public YouTube watch URL and the S Tournament court spectator page on a second device. Verify audio, picture and overlay."}
] as const;

export default function BroadcastPreflight({courts}:{courts:CourtStream[]}){
 const [selected,setSelected]=useState(1);
 const [checked,setChecked]=useState<Record<number,boolean[]>>({1:[false,false,false,false],2:[false,false,false,false],3:[false,false,false,false]});
 const [mode,setMode]=useState<"single"|"distributed">("single");
 const current=checked[selected]??[false,false,false,false];
 const videoId=courts.find(c=>c.id===selected)?.youtube_video_id;
 const complete=current.filter(Boolean).length;
 const toggle=(index:number)=>setChecked(state=>({...state,[selected]:(state[selected]??[false,false,false,false]).map((v,i)=>i===index?!v:v)}));
 return <section className="panel panel-pad broadcast-preflight" aria-labelledby="broadcast-title">
  <div className="row between wrap">
   <div><div className="eyebrow">BROADCAST CONTROL · PHASE 1</div><h2 className="section-title" id="broadcast-title">Launch your first court stream</h2><p className="help-note" style={{marginTop:9}}>Run this checklist with a Court 1 unlisted test, then repeat for Courts 2 and 3.</p></div>
   <span className="badge scheduled">OPERATOR CHECKLIST · NOT LIVE STATUS</span>
  </div>
  <div className="broadcast-court-tabs" role="group" aria-label="Select court to prepare">{[1,2,3].map(court=><button type="button" key={court} className={"btn "+(selected===court?"btn-primary":"")} aria-pressed={selected===court} onClick={()=>setSelected(court)}>Court {String(court).padStart(2,"0")}</button>)}</div>
  <div className="grid cols-2 broadcast-preflight-layout">
   <div>
    <div className="row between wrap"><strong>Preflight · Court {selected}</strong><span className="text-muted" style={{fontSize:12}}>{complete}/4 manually checked</span></div>
    <div className="broadcast-progress" role="progressbar" aria-label="Operator preflight progress" aria-valuemin={0} aria-valuemax={4} aria-valuenow={complete}><span style={{width:(complete*25)+"%"}}/></div>
    <div className="broadcast-checklist">{PREFLIGHT.map((step,index)=><button type="button" className={"broadcast-step"+(current[index]?" is-checked":"")} key={step.label} aria-pressed={current[index]} onClick={()=>toggle(index)}>
     <span className="broadcast-step-tick" aria-hidden="true">{current[index]?<Check size={18}/>:index+1}</span>
     <span><strong>{step.label}</strong><small>{step.tip}</small></span>
    </button>)}</div>
    <button className="btn" style={{marginTop:14}} onClick={()=>setChecked(v=>({...v,[selected]:[false,false,false,false]}))}><RotateCcw size={14}/> Reset Court {selected} checks</button>
    <p className="help-note" style={{marginTop:10}}>These checkmarks are manual notes for this page session; they do not verify stream health or start/stop OBS or YouTube.</p>
   </div>
   <div className="broadcast-setup-side">
    <h3 className="section-title" style={{fontSize:16}}>Court {selected} connections</h3>
    <div className="broadcast-status-row"><span><Camera size={17}/> Camera feed</span><span>Verify in OBS</span></div>
    <div className="broadcast-status-row"><span><MonitorPlay size={17}/> OBS encoder</span><span>Verify in OBS</span></div>
    <div className="broadcast-status-row"><span><Youtube size={17}/> YouTube watch link</span><span className={videoId?"broadcast-connected":"broadcast-pending"}>{videoId?"LINK SAVED":"NOT LINKED"}</span></div>
    <div className="broadcast-status-row"><span><Radio size={17}/> Public court page</span><span>Ready to preview</span></div>
    <div className="broadcast-links">
     <a className="btn" href="https://studio.youtube.com/" target="_blank" rel="noopener noreferrer"><Youtube size={15}/> Open YouTube Studio <ExternalLink size={12}/></a>
     <Link className="btn" href="/admin/viewer-links"><ClipboardCheck size={15}/> Save public watch link <ArrowRight size={12}/></Link>
     <Link className="btn" href={"/watch/"+selected} target="_blank" rel="noopener noreferrer"><MonitorPlay size={15}/> Preview spectator page <ExternalLink size={12}/></Link>
     {videoId&&<a className="btn" href={youtubeWatchUrl(videoId)} target="_blank" rel="noopener noreferrer"><Video size={15}/> Open saved YouTube video <ExternalLink size={12}/></a>}
    </div>
    <div className="broadcast-security"><ShieldCheck size={17}/><span>Only public watch URLs belong in the site. Keep RTMP stream keys, phone camera view links and expiring OBS overlay links private.</span></div>
   </div>
  </div>
  <div className="broadcast-modes">
   <div className="row between wrap"><strong>Three independent court outputs</strong><span className="help-note">Choose the planned encoding layout</span></div>
   <div className="row wrap" style={{marginTop:11}}>
    <button type="button" className={"btn "+(mode==="single"?"btn-primary":"")} aria-pressed={mode==="single"} onClick={()=>setMode("single")}>One laptop · 3 encoders</button>
    <button type="button" className={"btn "+(mode==="distributed"?"btn-primary":"")} aria-pressed={mode==="distributed"} onClick={()=>setMode("distributed")}>Three encoder devices</button>
   </div>
   <p className="help-note" style={{marginTop:13}}>
    {mode==="single"?"Use three independent encoder instances/outputs, one scene collection and YouTube stream key per court. OBS scene switching alone cannot send three different court videos simultaneously. Test RTX 4060 encoder/decoder utilization and phone-feed stability before event day.":"Run one independent OBS/encoder instance per device and send each court to its own YouTube broadcast. A separate browser source can load that court's signed score overlay."}
   </p>
   <p className="help-note"><strong>Starting encoder preset:</strong> 1280 × 720, 30 FPS, H.264 NVENC, CBR 8,000 Kbps video, 128 Kbps AAC audio, 2-second keyframes. A three-stream setup is roughly 24.4 Mbps outbound before overhead. Measure sustained <em>upload</em> speed, reserve headroom and test movement.</p>
   <div className="row wrap"><a className="btn" href="https://obsproject.com/download" target="_blank" rel="noopener noreferrer">OBS Studio <ExternalLink size={12}/></a><a className="btn" href="https://vdo.ninja/" target="_blank" rel="noopener noreferrer">Phone camera option <ExternalLink size={12}/></a><a className="btn" href="https://github.com/SalmanRatnani/s-tournament-system/blob/main/docs/OBS_YOUTUBE_BROADCAST.md" target="_blank" rel="noopener noreferrer">Full operations guide <ExternalLink size={12}/></a></div>
  </div>
 </section>;
}
