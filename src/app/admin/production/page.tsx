"use client";
import {useState} from "react";
import Link from "next/link";
import {ArrowRight,Clapperboard,Copy,ExternalLink,Radio,Youtube} from "lucide-react";
import {Organizer,ErrorNotice} from "@/components/organizer";
import {supabaseBrowser} from "@/lib/supabase";
import {useCourtStreams} from "@/lib/use-court-streams";
import {youtubeWatchUrl} from "@/lib/youtube";

export default function Production(){
 const [links,setLinks]=useState<Record<number,string>>({});
 const [busy,setBusy]=useState<number|null>(null);
 const [error,setError]=useState("");
 const [copied,setCopied]=useState("");
 const {courts,loading:streamsLoading,error:streamsError}=useCourtStreams();
 async function make(court:number){
  setError("");setBusy(court);
  try{
   const db=supabaseBrowser();if(!db)throw Error("Connect the tournament database first.");
   const token=(await db.auth.getSession()).data.session?.access_token;
   if(!token)throw Error("Main Controller login required.");
   const response=await fetch("/api/admin/overlay-links",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({court})});
   const body=await response.json();if(!response.ok)throw Error(body.error||"Cannot create OBS link");
   setLinks(v=>({...v,[court]:window.location.origin+body.path}));
  }catch(e){setError(e instanceof Error?e.message:"Unable to generate OBS link");}finally{setBusy(null);}
 }
 async function copy(url:string){try{await navigator.clipboard.writeText(url);setCopied(url);}catch{setError("Clipboard unavailable, manually select and copy link.");}}
 return <Organizer title="OBS & YouTube production" subtitle="Private overlays and broadcast setup for three independently streamed courts.">
 {()=> <>
  <div className="panel panel-pad" style={{marginBottom:20}}>
   <div className="row"><Radio color="var(--mint)" size={20}/><h2 className="section-title">Start with a Court 1 test broadcast</h2></div>
   <p className="help-note" style={{marginTop:12}}>OBS sends the video to YouTube; this site embeds the public YouTube watch link. Never put a YouTube stream key into this website. An OBS score link is different from a YouTube stream key.</p>
   <div className="grid cols-3" style={{marginTop:17}}>
    <div><strong>1. Prepare OBS</strong><p className="help-note" style={{marginTop:9}}>Add the Court 1 camera as a Video Capture Device. Generate the private Court 1 overlay link below, add a Browser Source above the camera and set 1920 × 1080.</p></div>
    <div><strong>2. Send to YouTube</strong><p className="help-note" style={{marginTop:9}}>Create an Unlisted encoder livestream in YouTube Studio. Configure OBS Settings → Stream with the YouTube service and private stream key; then start a test broadcast.</p><a className="btn" href="https://studio.youtube.com/" target="_blank" rel="noopener noreferrer"><Youtube size={15}/> Open YouTube Studio <ExternalLink size={13}/></a></div>
    <div><strong>3. Connect spectators</strong><p className="help-note" style={{marginTop:9}}>Copy the public YouTube watch URL (not the stream key) and save it under Viewer links. Open the Court 1 spectator page to confirm video playback.</p><Link className="btn" href="/admin/viewer-links">Set YouTube links <ArrowRight size={14}/></Link></div>
   </div>
   <p className="help-note" style={{marginTop:18}}>First-time YouTube live streaming activation may take up to 24 hours. OBS normally broadcasts one scene/program output at a time: three different simultaneous courts need three independent encoder outputs, not three OBS scenes switching on one output.</p>
  </div>
  <div className="callout" style={{marginBottom:20}}>Each private score-overlay link grants read-only access for 24 hours. Keep it only in OBS; do not share it with viewers or publish it on YouTube. If there is no assigned match, the overlay displays a standby graphic.</div>
  <div className="grid cols-3">{[1,2,3].map(court=>{
   const videoId=courts.find(c=>c.id===court)?.youtube_video_id;
   return <div className="panel panel-pad" key={court}>
    <Clapperboard color="var(--mint)"/><h2 style={{marginTop:12}}>Court {String(court).padStart(2,"0")}</h2>
    <p className="help-note">YouTube: {streamsLoading?"Checking saved stream link…":videoId?"Public watch link saved":"No watch link saved yet"}</p>
    {videoId?<a className="btn" href={youtubeWatchUrl(videoId)} target="_blank" rel="noopener noreferrer"><Youtube size={15}/> View YouTube broadcast <ExternalLink size={13}/></a>:<Link href="/admin/viewer-links" className="btn">Add YouTube watch link <ArrowRight size={14}/></Link>}
    <Link className="btn" href={"/watch/"+court} target="_blank" rel="noopener noreferrer" style={{marginTop:9}}>Test public court page <ExternalLink size={13}/></Link>
    <button className="btn btn-primary" style={{marginTop:15}} disabled={busy!==null} onClick={()=>void make(court)}>{busy===court?"Generating...":"Generate private OBS link"}</button>
    {links[court]&&<>
     <p className="help-note" style={{marginTop:18}}>Expires in 24 hours. Generate a replacement and refresh the OBS Browser Source before it expires.</p>
     <code className="viewer-link-value" style={{wordBreak:"break-all"}}>{links[court]}</code>
     <div className="row wrap" style={{marginTop:10}}><button className="btn" onClick={()=>void copy(links[court])}><Copy size={15}/>{copied===links[court]?"Copied":"Copy OBS link"}</button><a className="btn" href={links[court]} target="_blank" rel="noreferrer noopener"><ExternalLink size={15}/> Test overlay</a></div>
    </>}
   </div>;
  })}</div>
  <p className="help-note" style={{marginTop:20}}>The server verifies private score-overlay tokens before rendering. They cannot update scores or team data. If an OBS URL leaks, rotate the server signing secret to invalidate existing URLs. No YouTube stream keys are stored here.</p>
  <ErrorNotice message={error||streamsError}/>
 </>}</Organizer>;
}
