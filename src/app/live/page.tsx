"use client";
import Link from "next/link";
import {ArrowUpRight,Radio,Youtube,MonitorPlay} from "lucide-react";
import {Shell,PageHeading} from "@/components/shell";
import {useMatches} from "@/lib/use-matches";
import {useCourtStreams} from "@/lib/use-court-streams";
import {youtubeWatchUrl} from "@/lib/youtube";
import {CourtCard} from "@/components/court-card";
export default function LiveViewerHub(){
 const {matches,loading,error}=useMatches();
 const {courts}=useCourtStreams();
 return <Shell title="LIVE STREAMS" mode="public"><div className="content animate-in viewer-page">
  <section className="viewer-hero"><div className="eyebrow"><Radio size={14}/> LIVE BADMINTON • FREE TO WATCH</div><h1 className="headline display">One tournament.<br/><span className="text-green">Three live courts.</span></h1><p className="subline">Your front-row seat to every rally. Choose a court, watch the YouTube livestream and follow live scores. No login, subscription or account required.</p></section>
  {error&&<div className="error">{error}</div>}
  <div className="grid cols-3" style={{marginTop:25}}>{[1,2,3].map(court=>{
   const live=matches.filter(m=>m.court_id===court&&m.kind!=="team_tie").sort((a,b)=>(a.status==="live"?0:a.status==="paused"?1:2)-(b.status==="live"?0:b.status==="paused"?1:2))[0];
   const videoId=courts.find(c=>c.id===court)?.youtube_video_id;
   return <article className="panel viewer-court" key={court}>
    <div className="viewer-court-banner"><div className="row between"><span className="eyebrow" style={{margin:0}}>COURT {String(court).padStart(2,"0")}</span><span className={"badge "+(live?.status||"scheduled")}>{videoId?"STREAM LINKED":live?.status==="live"?"LIVE SCORING":"AWAITING STREAM"}</span></div><MonitorPlay size={48} color="var(--mint)"/></div>
    <div className="panel-pad"><h2 className="section-title">{live?live.side_a+" vs "+live.side_b:"Ready for the next match"}</h2><p className="help-note" style={{marginTop:9}}>{live?live.round+" • "+live.score_a+" – "+live.score_b:"The Main Controller will schedule the next court match."}</p>
     <Link href={"/watch/"+court} className="btn btn-primary" style={{width:"100%",marginTop:14}}><Radio size={16}/> Open court stream <ArrowUpRight size={14}/></Link>
     {videoId&&<a className="btn" style={{width:"100%",marginTop:9}} href={youtubeWatchUrl(videoId)} target="_blank" rel="noopener noreferrer"><Youtube size={16}/> Watch on YouTube</a>}
    </div>
   </article>;
  })}</div>
  <div className="section-head"><h2 className="section-title">Scoreboard activity</h2><span className="text-muted">{loading?"Updating...":"Updated from the tournament feed"}</span></div>
  <div className="grid cols-3">{[1,2,3].map(court=>{
   const active=matches.filter(m=>m.court_id===court&&m.kind!=="team_tie"&&(m.status==="live"||m.status==="paused"))[0];
   return active?<CourtCard key={court} m={active}/>:<div className="panel panel-pad" key={court}><strong>Court {court}</strong><p className="help-note" style={{marginTop:14}}>No live match on this court.</p></div>;
  })}</div>
 </div></Shell>;
}