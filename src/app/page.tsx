"use client";
import Link from "next/link";
import {ArrowRight,ArrowUpRight,CalendarDays,ChevronRight,Radio,ShieldCheck,Sparkles,Trophy,Users,Video} from "lucide-react";
import {Shell,SectionHead} from "@/components/shell";
import {CourtCard} from "@/components/court-card";
import {useMatches} from "@/lib/use-matches";
import {useCourtStreams} from "@/lib/use-court-streams";
import type {Match} from "@/lib/types";

const courtIds=[1,2,3] as const;
const priority=(m:Match)=>m.status==="live"?0:m.status==="paused"?1:m.status==="scheduled"?2:3;

export default function Home(){
 const {matches,loading,error}=useMatches();
 const {courts}=useCourtStreams();
 const rubbers=matches.filter(m=>m.kind!=="team_tie");
 const active=rubbers.filter(m=>m.status==="live"||m.status==="paused");
 const complete=rubbers.filter(m=>m.status==="completed");
 const linked=courts.filter(c=>c.youtube_video_id).length;
 const spotlight=active.slice().sort((a,b)=>priority(a)-priority(b)||a.court_id-b.court_id);
 return <Shell title="THE MATCH EXPERIENCE" mode="public">
  <div className="content animate-in public-home launch-home">
   <section className="launch-hero">
    <div className="launch-hero-content">
     <div className="launch-kicker"><span className="signal-dot"/><span>BADMINTON · LIVE TOURNAMENT EXPERIENCE</span></div>
     <h1 className="launch-title display">Every rally.<br/>Every moment.<br/><em>One destination.</em></h1>
     <p className="launch-description">Three courts. Six teams. One unforgettable championship. Follow the action, watch court broadcasts and track every point in one place.</p>
     <div className="row wrap launch-actions">
      <Link className="btn btn-primary launch-cta" href="/live"><Radio size={18}/> Enter the live arena <ArrowRight size={17}/></Link>
      <Link className="btn launch-cta-secondary" href="/schedule">Explore the schedule <ArrowUpRight size={16}/></Link>
     </div>
     <div className="launch-hero-meta"><span><ShieldCheck size={15}/> Free for every spectator</span><span><Video size={15}/> Three independent courts</span></div>
    </div>
    <div className="launch-hero-visual" aria-label="Court broadcast preview">
     <div className="launch-stage-top"><span className="launch-mark">S / TOURNAMENT</span><span className="launch-status"><span className="signal-dot"/>{active.length?"ON COURT":"EVENT STANDBY"}</span></div>
     <div className="launch-court-illustration" aria-hidden="true"><div className="launch-court-field"><span className="court-divider"/><span className="court-service court-service-a"/><span className="court-service court-service-b"/><span className="court-circle"/></div></div>
     <div className="launch-stage-bottom"><div><span className="launch-stage-label">THE ARENA</span><strong>COURTS 01—03</strong></div><div className="launch-stage-index">01 <span>/ 03</span></div></div>
    </div>
   </section>
   <div className="launch-trustline"><span><span className="signal-dot"/> {active.length?active.length+" matches on court":"Awaiting first serve"}</span><span>LIVE SCORES & RESULTS</span><span>{linked} / 3 BROADCASTS CONNECTED</span></div>
   <section aria-labelledby="home-stats" className="launch-stats-section">
    <h2 id="home-stats" className="sr-only">Tournament at a glance</h2>
    <div className="launch-metrics">
     <div><span className="metric-icon"><Radio size={18}/></span><strong>03</strong><span>Courts</span></div>
     <div><span className="metric-icon"><Users size={18}/></span><strong>06</strong><span>Team slots</span></div>
     <div><span className="metric-icon"><Trophy size={18}/></span><strong>{String(complete.length).padStart(2,"0")}</strong><span>Completed matches</span></div>
     <div><span className="metric-icon"><Video size={18}/></span><strong>{String(linked).padStart(2,"0")}</strong><span>Streams linked</span></div>
    </div>
   </section>
   <section className="launch-section" aria-labelledby="home-courts">
    <div className="launch-section-head"><div><div className="eyebrow">RIGHT NOW</div><h2 id="home-courts" className="launch-section-title">The courts are yours.</h2><p className="subline">Choose a court to watch. Scores appear as officials record them.</p></div><Link href="/live" className="btn">All three courts <ArrowRight size={15}/></Link></div>
    {error&&<div className="error" role="alert">{error}</div>}
    {loading?<div className="launch-skeleton" role="status">Connecting to tournament scores…</div>:spotlight.length?
     <div className="grid cols-3">{spotlight.slice(0,3).map(m=><CourtCard key={m.id} m={m}/>)}</div>:
     <div className="grid cols-3">{courtIds.map(court=><Link href={"/watch/"+court} key={court} className="launch-empty-court">
      <div className="row between"><span className="eyebrow">COURT {String(court).padStart(2,"0")}</span><ArrowUpRight size={18}/></div>
      <span className="launch-court-number">{String(court).padStart(2,"0")}</span>
      <span className="launch-empty-title">{courts.find(c=>c.id===court)?.youtube_video_id?"Broadcast link ready":"Awaiting first serve"}</span>
      <span className="launch-empty-description">Open court viewing <ChevronRight size={14}/></span>
     </Link>)}</div>}
   </section>
   <section className="launch-section" aria-labelledby="home-explore">
    <div className="launch-section-head"><div><div className="eyebrow">MORE THAN THE SCORE</div><h2 id="home-explore" className="launch-section-title">Everything, courtside.</h2></div></div>
    <div className="grid cols-3 launch-discover">
     <Link href="/schedule" className="launch-discover-card"><span className="launch-discover-icon"><CalendarDays size={24}/></span><span className="launch-discover-tag">01 / THE COMPETITION</span><strong>Fixtures & schedule</strong><p>Know who's up next, which court they're playing on and how the championship unfolds.</p><span className="launch-discover-arrow"><ArrowUpRight size={18}/></span></Link>
     <Link href="/standings" className="launch-discover-card"><span className="launch-discover-icon"><Trophy size={24}/></span><span className="launch-discover-tag">02 / THE RACE</span><strong>League standings</strong><p>Follow the rankings as six squads battle for four playoff spots.</p><span className="launch-discover-arrow"><ArrowUpRight size={18}/></span></Link>
     <Link href="/players" className="launch-discover-card"><span className="launch-discover-icon"><Sparkles size={24}/></span><span className="launch-discover-tag">03 / THE ATHLETES</span><strong>Meet the players</strong><p>Explore the players, playing captains and squads behind every result.</p><span className="launch-discover-arrow"><ArrowUpRight size={18}/></span></Link>
    </div>
   </section>
   <div className="launch-final-cta"><div><div className="eyebrow">DON'T MISS A MOMENT</div><h2>One link. All the action.</h2><p>No sign-up. No subscription. Just badminton.</p></div><Link href="/live" className="btn btn-primary launch-cta">Explore live courts <ArrowRight size={16}/></Link></div>
  </div>
 </Shell>;
}
