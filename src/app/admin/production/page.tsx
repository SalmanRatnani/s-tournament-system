"use client";
import {useState} from "react";
import {Clapperboard,Copy,ExternalLink} from "lucide-react";
import {Organizer,ErrorNotice} from "@/components/organizer";
import {supabaseBrowser} from "@/lib/supabase";
export default function Production(){
 const [links,setLinks]=useState<Record<number,string>>({});
 const [busy,setBusy]=useState<number|null>(null);
 const [error,setError]=useState("");
 const [copied,setCopied]=useState("");
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
 return <Organizer title="OBS production" subtitle="Main Controller only. Generate private, expiring scoreboard overlay links for your three OBS browser sources.">
 {()=> <><div className="callout" style={{marginBottom:20}}>OBS cannot sign in interactively. Each private link grants read-only access to one court's score overlay for 24 hours. Treat it as a password: paste only into OBS, never share it with viewers or publish it on YouTube.</div>
 <div className="grid cols-3">{[1,2,3].map(court=><div className="panel panel-pad" key={court}><Clapperboard color="var(--mint)"/><h2 style={{marginTop:12}}>Court {String(court).padStart(2,"0")}</h2>
 <button className="btn btn-primary" disabled={busy!==null} onClick={()=>void make(court)}>{busy===court?"Generating...":"Generate private OBS link"}</button>
 {links[court]&&<><p className="help-note" style={{marginTop:18}}>Expires in 24 hours. Generate a new URL to replace this browser source after expiry.</p><code className="viewer-link-value" style={{wordBreak:"break-all"}}>{links[court]}</code><div className="row wrap" style={{marginTop:10}}><button className="btn" onClick={()=>void copy(links[court])}><Copy size={15}/>{copied===links[court]?"Copied":"Copy OBS link"}</button><a className="btn" href={links[court]} target="_blank" rel="noreferrer noopener"><ExternalLink size={15}/> Test</a></div></>}
 </div>)}</div><p className="help-note" style={{marginTop:20}}>The server checks the token before rendering the overlay. The token is read-only and cannot update scoring or team data. If a URL leaks, rotate the server signing key to invalidate all existing links.</p><ErrorNotice message={error}/></>}</Organizer>;
}
