"use client";
import {Fragment,useMemo} from "react";
import Link from "next/link";
import {ArrowUpRight,CalendarDays,Clock3,MapPin,Trophy} from "lucide-react";
import {usePublicEvent} from "@/lib/use-public-scoreboard";
import {MBBL_EVENT_DATE_LABEL,MBBL_LEAGUE_ROUNDS,MBBL_NON_MATCH_SCHEDULE} from "@/lib/mbbl/fixtures";
import {MBBL_TEAMS} from "@/lib/mbbl/catalog";

import type {MBBLFixtureSlot as FixtureRow} from "@/lib/mbbl/overlay-display";
type TeamRow={id:string;name:string;tournament_id?:string|null};
const niceTime=(s:string)=>{const [h,m]=s.slice(0,5).split(":").map(Number);return (h%12||12)+":"+String(m).padStart(2,"0")+" "+(h>=12?"PM":"AM");};
const color=(name:string)=>MBBL_TEAMS.find(t=>t.name===name)?.accent||"#61e6ae";
const aliases:Record<string,string>={"MB Baddy Group":"MB Baddys","Bad Minions":"Bad Minions"};
function TeamLabel({name}:{name:string}){return <span className="mbbl-fixture-name"><span className="mbbl-fixture-dot" style={{background:color(name)}}/>{aliases[name]||name}</span>;}
export default function MBBLFixtureSchedule({teams}:{teams:TeamRow[]}){
 const feed=usePublicEvent();
 const eventId=teams.find(t=>MBBL_TEAMS.some(v=>v.name===t.name))?.tournament_id;
 const slots=feed.fixtures.filter(s=>s.tournament_id===eventId);
 const loading=feed.loading;
 const error=feed.error;
 const byId=useMemo(()=>new Map(teams.map(t=>[t.id,t.name])),[teams]);
 const league=slots.filter(x=>x.stage==="league");
 const semifinals=slots.filter(x=>x.stage==="semifinal");
 const final=slots.filter(x=>x.stage==="final");
 const findByRound=(round:number,court:number)=>league.find(s=>s.round_no===round&&s.court_id===court);
 const formatMatch=(s:FixtureRow|null|undefined)=>{
  if(!s)return <span className="help-note">Awaiting published fixture</span>;
  return <div className="mbbl-matchup"><TeamLabel name={byId.get(s.team_a_id||"")||"TBC"}/><span className="mbbl-fixture-versus">VS</span><TeamLabel name={byId.get(s.team_b_id||"")||"TBC"}/>{s.status!=="scheduled"&&<small className="mbbl-fixture-alert">{s.status.toUpperCase()}</small>}</div>;
 };
 return <div className="mbbl-schedule">
  <div className="mbbl-fixture-intro">
   <div><div className="eyebrow">OFFICIAL MBBL SEASON 1 TIMETABLE</div><h2>Every round. Every court.</h2><p>Five league rounds, three simultaneous courts, then the top-four playoffs.</p></div>
   <div className="mbbl-fixture-stats"><span><CalendarDays size={15}/> {MBBL_EVENT_DATE_LABEL}</span><span><Clock3 size={15}/> All times IST</span><span><MapPin size={15}/> Three courts</span></div>
  </div>
  {error&&<div className="error" role="alert">Unable to load published fixtures: {error}</div>}
  {loading?<div className="panel empty" role="status">Loading official MBBL fixtures…</div>:league.length!==15?<div className="panel empty">The MBBL fixture timetable is being prepared for publication. {league.length} of 15 league ties are currently published.</div>:<>
   <div className="mbbl-timetable-wrap">
    <table className="mbbl-timetable">
     <thead><tr><th scope="col">Time / Stage</th><th scope="col">Court 1</th><th scope="col">Court 2</th><th scope="col">Court 3</th></tr></thead>
     <tbody>
      {MBBL_NON_MATCH_SCHEDULE.filter(e=>["reporting","breakfast","opening"].includes(e.key)).map(e=><tr key={e.key} className="mbbl-timetable-event"><th scope="row">{niceTime(e.time)}{e.end?" – "+niceTime(e.end):""}</th><td colSpan={3}>{e.title}</td></tr>)}
      {MBBL_LEAGUE_ROUNDS.map(r=><Fragment key={r.round}>
       <tr key={"round-"+r.round} className="mbbl-timetable-league">
        <th scope="row"><span className="mbbl-fixture-round">ROUND {r.round}</span><span>{niceTime(r.start)} – {niceTime(r.end)}</span></th>
        {([1,2,3] as const).map(c=><td key={c}>{formatMatch(findByRound(r.round,c))}</td>)}
       </tr>
       {r.round===3&&<tr key="lunch" className="mbbl-timetable-break"><th scope="row">1:00 – 1:30 PM</th><td colSpan={3}>LUNCH BREAK · 30 MINUTES</td></tr>}
      </Fragment>)}
      <tr className="mbbl-timetable-knockout"><th scope="row"><span>SEMIFINALS</span><span>4:30 – 6:00 PM</span></th>
       <td>{semifinals.find(x=>x.court_id===1)?<div><strong>Semifinal 1</strong><small>LEAGUE RANK 1 vs RANK 4</small></div>: "Semifinal 1 · Rank 1 vs Rank 4"}</td>
       <td>{semifinals.find(x=>x.court_id===2)?<div><strong>Semifinal 2</strong><small>LEAGUE RANK 2 vs RANK 3</small></div>:"Semifinal 2 · Rank 2 vs Rank 3"}</td>
       <td>—</td>
      </tr>
      <tr className="mbbl-timetable-final"><th scope="row"><span>GRAND FINAL</span><span>6:00 – 7:30 PM</span></th><td colSpan={3}>{final.length?"Winner SF1 vs Winner SF2":"Winner SF1 vs Winner SF2"} · Court assigned by organiser</td></tr>
      <tr className="mbbl-timetable-event"><th scope="row">7:30 – 9:00 PM</th><td colSpan={3}>PRIZE DISTRIBUTION & CLOSING CEREMONY · BUFFET TIME</td></tr>
     </tbody>
    </table>
   </div>
   <div className="mbbl-fixture-foot">
    <span><Trophy size={16}/> {league.length} / 15 league ties published</span>
    <span>Semifinals and final participants depend on completed league standings.</span>
   </div>
  </>}
  <div className="mbbl-fixture-note">These are scheduled team ties, not completed results or active referee games. Each tie requires nine compulsory doubles games under the MBBL Season 1 rules. Match start times may change under organiser control. Event date confirmed by the organiser: {MBBL_EVENT_DATE_LABEL}.</div>
  <div className="row wrap" style={{marginTop:20}}><Link href="/mbbl" className="btn">Meet the six teams <ArrowUpRight size={15}/></Link><Link href="/mbbl/rules" className="btn">Match format & rules <ArrowUpRight size={15}/></Link></div>
 </div>;
}
