"use client";
import {useState} from "react";
import {Copy,ExternalLink,Link2,Radio,Youtube} from "lucide-react";
import {Organizer,ErrorNotice} from "@/components/organizer";
import {youtubeVideoId,youtubeWatchUrl} from "@/lib/youtube";
import {useCourtStreams} from "@/lib/use-court-streams";
import {supabaseBrowser} from "@/lib/supabase";
export default function ViewerLinks(){
 const streams=useCourtStreams();
 const [inputs,setInputs]=useState<Record<number,string>>({});
 const [busy,setBusy]=useState<number|null>(null);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");
 const [copied,setCopied]=useState("");
 const url=(path:string)=>typeof window==="undefined"?path:window.location.origin+path;
 async function copy(value:string){try{await navigator.clipboard.writeText(value);setCopied(value);}catch{setError("Clipboard unavailable. Select and copy the link manually.");}}
 async function save(court:number){
  setError("");setNotice("");setBusy(court);
  try{
   const db=supabaseBrowser();if(!db)throw Error("Configure a separate Supabase project first.");
   const token=(await db.auth.getSession()).data.session?.access_token;if(!token)throw Error("Sign in again.");
   const current=streams.courts.find(c=>c.id===court)?.youtube_video_id||"";
   const entered=inputs[court]??current;
   if(entered.trim()&&!youtubeVideoId(entered))throw Error("Enter a valid YouTube LIVE/watch link or video ID.");
   const response=await fetch("/api/admin/court-streams",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({court,url:entered})});
   const data=await response.json();if(!response.ok)throw Error(data.error||"Save failed");
   setInputs(o=>({...o,[court]:data.youtube_video_id||""}));
   setNotice("Court "+court+" stream saved. Its public viewing link remains the same.");
  }catch(e){setError(e instanceof Error?e.message:"Save failed");}finally{setBusy(null);}
 }
 return <Organizer title="Viewer links & YouTube" subtitle="Send one public link to all spectators. No viewer accounts, passwords, or registration.">
 {()=> <div className="viewer-manager">
  <div className="panel panel-pad" style={{marginBottom:18}}>
   <div className="row"><Radio color="var(--mint)"/><h2 className="section-title">Main spectator link</h2></div>
   <p className="subline" style={{marginTop:12}}>Share this link with everyone. They can choose between three courts, follow the live scores and watch YouTube.</p>
   <div className="row wrap"><code className="viewer-link-value">{url("/live")}</code><button className="btn btn-primary" onClick={()=>void copy(url("/live"))}><Copy size={15}/>{copied===url("/live")?"Copied":"Copy spectator link"}</button><a className="btn" href="/live" target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Preview</a></div>
  </div>
  <div className="grid cols-3">{[1,2,3].map(court=>{
   const current=streams.courts.find(c=>c.id===court)?.youtube_video_id||"";
   const value=inputs[court]??current;
   return <div className="panel panel-pad" key={court}>
    <div className="row between"><h2 className="section-title">Court {String(court).padStart(2,"0")}</h2><Youtube color="#e44"/></div>
    <p className="help-note" style={{marginTop:14}}>Permanent viewer link</p>
    <code className="viewer-link-value">{url("/watch/"+court)}</code>
    <button className="btn" style={{marginTop:12}} onClick={()=>void copy(url("/watch/"+court))}><Copy size={15}/> Copy court link</button>
    <label className="field" style={{marginTop:24}}>Public YouTube livestream link<input className="input" value={value} onChange={e=>setInputs(o=>({...o,[court]:e.target.value}))} placeholder="https://www.youtube.com/live/..." spellCheck={false}/></label>
    <button className="btn btn-primary" style={{marginTop:12}} disabled={busy!==null||streams.loading} onClick={()=>void save(court)}><Link2 size={15}/>{busy===court?"Saving...":"Save YouTube stream"}</button>
    {current&&<a className="btn" style={{marginTop:12}} href={youtubeWatchUrl(current)} target="_blank" rel="noopener noreferrer"><Youtube size={15}/> Open on YouTube <ExternalLink size={13}/></a>}
    <p className="help-note" style={{marginTop:16}}>Never paste private YouTube stream keys or OBS RTMP credentials.</p>
   </div>;
  })}</div>
  <div className="callout" style={{marginTop:20}}>Start each broadcast from OBS, paste its public YouTube link here and share the spectator URL. Changing a YouTube event never changes the permanent court viewer link.</div>
  {notice&&<p role="status" className="text-green" style={{marginTop:18}}>{notice}</p>}
  <ErrorNotice message={error||streams.error}/>
 </div>}
 </Organizer>;
}