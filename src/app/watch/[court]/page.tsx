"use client";
import {useParams} from "next/navigation";
import Link from "next/link";
import {Camera,ChevronLeft,ExternalLink,Youtube,Radio} from "lucide-react";
import {Shell,PageHeading} from "@/components/shell";
import {useLiveCourt} from "@/lib/use-live-court";
import {useCourtStreams} from "@/lib/use-court-streams";
import {youtubeEmbedUrl,youtubeWatchUrl} from "@/lib/youtube";
import {CourtCard} from "@/components/court-card";
export default function WatchCourt(){
 const court=Number(useParams().court);
 const valid=Number.isInteger(court)&&court>=1&&court<=3;
 const {match:m}=useLiveCourt(court);
 const {courts,loading}=useCourtStreams();
 const videoId=courts.find(c=>c.id===court)?.youtube_video_id;
 return <Shell title={"WATCH COURT "+court} mode="public"><div className="content animate-in viewer-page">
  <PageHeading eyebrow="LIVE STREAM • NO LOGIN REQUIRED" title={valid?"Court "+String(court).padStart(2,"0"):"Court not found"} subtitle="Watch on this site or YouTube. Scores update independently from the stream, which may have a broadcast delay." actions={<Link href="/live" className="btn"><ChevronLeft size={15}/> All live courts</Link>}/>
  {!valid?<div className="panel panel-pad">Choose Court 1, 2 or 3 from the <Link href="/live">live viewer hub</Link>.</div>:<div className="grid watch-layout">
   <div>
    <div className="watch-video">{videoId?<iframe src={youtubeEmbedUrl(videoId)} title={"Court "+court+" YouTube livestream"} allow="accelerometer;autoplay;encrypted-media;picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy"/>:<div className="camera-icon"><Camera size={54}/><strong>{loading?"CHECKING BROADCAST":"BROADCAST NOT STARTED"}</strong><span>The Main Controller will connect Court {court}'s YouTube broadcast here. No account is required to watch.</span></div>}</div>
    <div className="row wrap viewer-actions">{videoId&&<a href={youtubeWatchUrl(videoId)} target="_blank" rel="noopener noreferrer" className="btn btn-primary"><Youtube size={18}/> Watch on YouTube <ExternalLink size={14}/></a>}<Link href="/live" className="btn"><Radio size={15}/> Browse all courts</Link></div>
   </div>
   <div>{m?<CourtCard m={m} />:<div className="panel panel-pad"><h2 className="section-title">Court {court} scoreboard</h2><p className="help-note">Scores will appear here when a match is assigned. The live YouTube feed is independent of fixture changes.</p></div>}
   <div className="panel panel-pad" style={{marginTop:14}}><div className="row"><Radio size={16} color="var(--mint)"/><strong style={{fontSize:13}}>Live scores</strong></div><p className="help-note" style={{marginTop:12}}>Referees update points on their assigned mobile devices. Live scoring can be ahead of the YouTube video because of streaming latency.</p></div></div>
  </div>}
 </div></Shell>;
}