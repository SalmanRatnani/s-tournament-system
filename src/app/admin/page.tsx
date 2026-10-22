"use client";
import Link from "next/link";
import {ArrowRight,CheckCircle2,Clapperboard,FileUp,Radio,Settings2,ShieldCheck,Trophy,Users,UserRoundCheck,CalendarDays} from "lucide-react";
import {Organizer,Count,TeamRosterRows} from "@/components/organizer";
export default function Admin(){return <Organizer title="Command center" subtitle="Your private headquarters for tournament preparation, live operations and broadcast production.">{({data})=>data&&(()=>{
 const readyTeams=data.teams.length===6;
 const readyPlayers=data.players.length===108&&data.teams.every(t=>data.players.filter(p=>p.team_id===t.id).length===18);
 const ties=data.matches.filter(m=>m.kind==="team_tie"&&m.round.startsWith("LEAGUE"));
 const live=data.matches.filter(m=>m.kind!=="team_tie"&&m.status==="live").length;
 const steps=[
  {title:"Create the championship",detail:"Set up the official tournament before inviting teams.",href:"/admin/teams",done:data.tournaments.length>0,icon:Trophy},
  {title:"Complete team rosters",detail:"Import the finished auction or register six teams with 18 players each.",href:data.teams.length?"/admin/teams":"/admin/import-auction",done:readyTeams&&readyPlayers,icon:Users},
  {title:"Prepare league fixtures",detail:"Generate the 15 league ties and assign playable match rubbers.",href:"/admin/fixtures",done:ties.length===15,icon:CalendarDays},
  {title:"Approve match officials",detail:"Set up referee logins and assign them to individual matches.",href:"/admin/referees",done:data.profiles.some(p=>p.role==="referee")&&data.assignments.length>0,icon:UserRoundCheck}
 ];
 const completed=steps.filter(x=>x.done).length;
 return <>
  <section className="controller-intro"><div><div className="eyebrow">MAIN CONTROLLER · OPERATIONS</div><h2>Run the tournament.<br/><span>Own every moment.</span></h2><p>Everything your teams, officials and viewers need — from the opening draw to the final rally.</p><div className="row wrap"><Link href="/admin/fixtures" className="btn btn-primary">Competition control <ArrowRight size={15}/></Link><Link href="/live" target="_blank" className="btn">View public arena <ArrowRight size={15}/></Link></div></div><div className="controller-intro-side"><Clapperboard size={38}/><strong>{live.toString().padStart(2,"0")}</strong><span>LIVE RUBBERS</span></div></section>
  <div className="grid cols-4" style={{margin:"22px 0"}}><Count label="Teams" value={data.teams.length+"/6"} subtitle="Championship squads"/><Count label="Registered players" value={data.players.length+"/108"} subtitle="18 per squad"/><Count label="League ties" value={ties.length+"/15"} subtitle="Round-robin stage"/><Count label="Referee assignments" value={data.assignments.length} subtitle="Court-official assignments"/></div>
  <section className="panel controller-readiness" aria-labelledby="readiness-heading"><div className="row between wrap" style={{marginBottom:21}}><div><div className="eyebrow">TOURNAMENT LAUNCH</div><h2 id="readiness-heading" className="section-title">Preparation checklist</h2><p className="help-note" style={{marginTop:7}}>Only real saved records count as completed.</p></div><div className="controller-progress">{completed} / {steps.length} complete</div></div>
   <div className="controller-progress-track" role="progressbar" aria-label="Tournament preparation progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={completed}><span style={{width:(100*completed/steps.length)+"%"}}/></div>
   <div className="controller-step-list">{steps.map((step,i)=><Link href={step.href} className="controller-step" key={i}><div className={"controller-step-icon"+(step.done?" ready":"")}>{step.done?<CheckCircle2 size={19}/>:<step.icon size={19}/>}</div><div><strong>{step.title}</strong><p>{step.detail}</p></div><span className={"controller-step-state"+(step.done?" complete":"")}>{step.done?"COMPLETE":"SET UP"}</span><ArrowRight size={17}/></Link>)}</div>
  </section>
  <div className="launch-section-head" style={{marginTop:34}}><div><div className="eyebrow">ON MATCH DAY</div><h2 className="launch-section-title">Production & operations</h2></div></div>
  <div className="grid cols-3 controller-operations">
   <Link className="launch-discover-card" href="/admin/viewer-links"><span className="launch-discover-icon"><Radio size={24}/></span><span className="launch-discover-tag">PUBLIC BROADCASTING</span><strong>Viewer links & YouTube</strong><p>Connect the court streams and share one spectator destination.</p><ArrowRight size={17}/></Link>
   <Link className="launch-discover-card" href="/admin/production"><span className="launch-discover-icon"><Clapperboard size={24}/></span><span className="launch-discover-tag">PRIVATE PRODUCTION</span><strong>OBS overlays</strong><p>Create signed scoreboard graphics for all three court broadcasts.</p><ArrowRight size={17}/></Link>
   <Link className="launch-discover-card" href="/admin/scoring-rules"><span className="launch-discover-icon"><Settings2 size={24}/></span><span className="launch-discover-tag">COMPETITION STANDARDS</span><strong>Scoring format</strong><p>Confirm the game length, match format and victory conditions.</p><ArrowRight size={17}/></Link>
  </div>
  <div className="launch-section-head" style={{marginTop:38}}><div><div className="eyebrow">PLAYERS & ADMINISTRATION</div><h2 className="launch-section-title">Squad readiness</h2></div><Link className="btn" href="/admin/teams">Manage rosters <ArrowRight size={14}/></Link></div>
  {data.teams.length?<TeamRosterRows data={data}/>:<div className="panel empty controller-empty"><ShieldCheck size={34} color="var(--mint)"/><h3>Your championship starts here.</h3><p>Create a tournament and import the completed auction rosters when you're ready.</p><div className="row wrap" style={{justifyContent:"center"}}><Link className="btn btn-primary" href="/admin/teams">Create tournament <ArrowRight size={14}/></Link><Link className="btn" href="/admin/import-auction"><FileUp size={14}/> Import auction</Link></div></div>}
 </>;
 })()}</Organizer>}
