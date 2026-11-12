"use client";
import Link from "next/link";
import {ArrowUpRight,Radio,Youtube,MonitorPlay,RefreshCcw} from "lucide-react";
import {Shell} from "@/components/shell";
import {usePublicScoreboard} from "@/lib/use-public-scoreboard";
import {youtubeVideoId,youtubeWatchUrl} from "@/lib/youtube";
import {PublicCourtScore} from "@/components/public-court-score";

export default function LiveViewerHub(){
 const feed=usePublicScoreboard();
 return <Shell title="LIVE STREAMS" mode="public"><div className="content animate-in viewer-page">
  <section className="viewer-hero"><div className="eyebrow"><Radio size={14}/> LIVE BADMINTON · FREE TO WATCH</div><h1 className="headline display">One tournament.<br/><span className="text-green">Three live courts.</span></h1><p className="subline">Choose your court and watch on YouTube with the official scoreboard in the video. No login or account required.</p></section>
  {feed.error&&<div className="error" role="alert">{feed.error}</div>}
  <div className="grid cols-3" style={{marginTop:25}}>{[1,2,3].map(court=>{
   const videoId=youtubeVideoId(feed.courts.find(c=>c.id===court)?.youtube_video_id||"");
   return <article className="panel viewer-court" key={court}>
    <div className="viewer-court-banner"><div className="row between"><span className="eyebrow" style={{margin:0}}>COURT {String(court).padStart(2,"0")}</span><span className="badge">{videoId?"STREAM LINKED":"AWAITING STREAM"}</span></div><MonitorPlay size={48} color="var(--mint)"/></div>
    <div className="panel-pad"><h2 className="section-title">Court {court} broadcast</h2><p className="help-note" style={{marginTop:9}}>Follow every rally and the umpire's score in the broadcast.</p>
     {videoId&&<a className="btn btn-primary" style={{width:"100%",marginTop:14}} href={youtubeWatchUrl(videoId)} target="_blank" rel="noopener noreferrer"><Youtube size={16}/> Watch on YouTube <ArrowUpRight size={14}/></a>}
     <Link href={"/watch/"+court} className="btn" style={{width:"100%",marginTop:9}}><Radio size={16}/> Court scores & links <ArrowUpRight size={14}/></Link>
    </div>
   </article>;
  })}</div>
  <div className="section-head"><div><h2 className="section-title">Score snapshot</h2><p className="help-note">{feed.loading?"Loading scores…":"Refresh for the latest court scores. The video scoreboard updates during play."}</p></div><button className="btn" disabled={feed.loading} onClick={()=>void feed.refresh()}><RefreshCcw size={15}/> Refresh scores</button></div>
  <div className="grid cols-3">{[1,2,3].map(court=><PublicCourtScore key={court} court={court} feed={feed}/>)}</div>
 </div></Shell>;
}
