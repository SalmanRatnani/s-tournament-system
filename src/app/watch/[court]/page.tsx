"use client";
import {useParams} from "next/navigation";
import Link from "next/link";
import {ChevronLeft,ExternalLink,Youtube,Radio,RefreshCcw,CalendarDays,Trophy} from "lucide-react";
import {Shell,PageHeading} from "@/components/shell";
import {usePublicScoreboard} from "@/lib/use-public-scoreboard";
import {PublicCourtScore} from "@/components/public-court-score";
import {ScoreFeedStatus} from "@/components/score-feed-status";
import {youtubeVideoId,youtubeWatchUrl} from "@/lib/youtube";

export default function WatchCourt(){
 const court=Number(useParams().court);
 const valid=Number.isInteger(court)&&court>=1&&court<=3;
 const feed=usePublicScoreboard();
 const {courts,loading,error,refresh}=feed;
 const videoId=youtubeVideoId(courts.find(c=>c.id===court)?.youtube_video_id||"");
 return <Shell title={"COURT "+court+" SCORES"} mode="public"><div className="content animate-in viewer-page">
  <PageHeading eyebrow="COURT SCORES · NO LOGIN REQUIRED" title={valid?"Court "+String(court).padStart(2,"0"):"Court not found"} subtitle="Check the latest recorded score here and watch the court broadcast on YouTube." actions={<Link href="/live" className="btn"><ChevronLeft size={15}/> All live courts</Link>}/>
  {!valid?<div className="panel panel-pad">Choose Court 1, 2 or 3 from the <Link href="/live">live viewer hub</Link>.</div>:<>
   {error&&<p className="error" role="alert">{error}</p>}
   <section aria-label="Court score snapshot" style={{marginBottom:20}}>
    <div className="section-head"><h2 className="section-title">Court score</h2><button className="btn" onClick={()=>void refresh()} disabled={loading}><RefreshCcw size={15}/> Refresh now</button></div>
    {loading?<p role="status" className="help-note">Loading the court score…</p>:<PublicCourtScore court={court} feed={feed}/>}
    <ScoreFeedStatus delivery={feed.delivery} receivedAt={feed.receivedAt}/>
   </section>
   <section className="panel panel-pad" aria-label="YouTube court broadcast"><div className="row"><Youtube size={28} color="var(--mint)"/><h2 className="section-title">Watch Court {court} on YouTube</h2></div><p className="subline" style={{marginTop:12}}>{videoId?"Open the broadcast on YouTube. The official scoreboard is included in the video.":loading?"Checking the broadcast link…":"The organiser has not published this court’s YouTube link yet."}</p>
    {videoId&&<a href={youtubeWatchUrl(videoId)} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{marginTop:16}}><Youtube size={18}/> Watch on YouTube <ExternalLink size={14}/></a>}
   </section>
   <div className="row wrap viewer-actions">
    <Link href="/live" className="btn"><Radio size={15}/> Browse all courts</Link>
    <Link href="/standings" className="btn"><Trophy size={15}/> Standings</Link>
    <Link href="/schedule" className="btn"><CalendarDays size={15}/> Schedule</Link>
   </div>
   <p className="help-note">The website score and the video can differ briefly because YouTube has a broadcast delay. The scoreboard within the video follows that broadcast.</p>
  </>}
 </div></Shell>;
}
