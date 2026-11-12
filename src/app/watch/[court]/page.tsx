"use client";
import {useParams} from "next/navigation";
import Link from "next/link";
import {Camera,ChevronLeft,ExternalLink,Youtube,Radio,RefreshCcw} from "lucide-react";
import {Shell,PageHeading} from "@/components/shell";
import {useCourtStreams} from "@/lib/use-court-streams";
import {youtubeEmbedUrl,youtubeWatchUrl} from "@/lib/youtube";

export default function WatchCourt(){
 const court=Number(useParams().court);
 const valid=Number.isInteger(court)&&court>=1&&court<=3;
 const {courts,loading,error,refresh}=useCourtStreams();
 const videoId=courts.find(c=>c.id===court)?.youtube_video_id;
 return <Shell title={"WATCH COURT "+court} mode="public"><div className="content animate-in viewer-page">
  <PageHeading eyebrow="LIVE STREAM · NO LOGIN REQUIRED" title={valid?"Court "+String(court).padStart(2,"0"):"Court not found"} subtitle="Watch every rally with the official scoreboard inside the broadcast." actions={<Link href="/live" className="btn"><ChevronLeft size={15}/> All live courts</Link>}/>
  {!valid?<div className="panel panel-pad">Choose Court 1, 2 or 3 from the <Link href="/live">live viewer hub</Link>.</div>:<>
   {error&&<p className="error" role="alert">{error}</p>}
   <div className="watch-video">{videoId?<iframe src={youtubeEmbedUrl(videoId)} title={"Court "+court+" YouTube livestream"} allow="accelerometer;autoplay;encrypted-media;picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy"/>:<div className="camera-icon"><Camera size={54}/><strong>{loading?"CHECKING BROADCAST":"BROADCAST NOT STARTED"}</strong><span>The Main Controller will connect Court {court}'s YouTube broadcast here.</span></div>}</div>
   <div className="row wrap viewer-actions">
    {videoId&&<a href={youtubeWatchUrl(videoId)} target="_blank" rel="noopener noreferrer" className="btn btn-primary"><Youtube size={18}/> Watch on YouTube <ExternalLink size={14}/></a>}
    <button className="btn" onClick={()=>void refresh()} disabled={loading}><RefreshCcw size={15}/> Refresh broadcast link</button>
    <Link href="/live" className="btn"><Radio size={15}/> Browse all courts</Link>
   </div>
   <p className="help-note">The score shown in the video follows the same broadcast as the camera. If the organiser replaces the stream, refresh the broadcast link. Video may have a short streaming delay.</p>
  </>}
 </div></Shell>;
}
