"use client";
import Link from "next/link";
import {Shell,PageHeading} from "@/components/shell";
import {useTournamentPublic} from "@/lib/use-tournament-public";
import {MBBL_TEAMS} from "@/lib/mbbl/catalog";
import MBBLFixtureSchedule from "@/components/mbbl-fixture-schedule";
export default function Schedule(){
 const {ties,teams,loading,error,demo}=useTournamentPublic();
 const isMBBL=!demo&&teams.some(t=>MBBL_TEAMS.some(m=>m.name===t.name));
 return <Shell title="TEAM FIXTURES" mode="public"><div className="content animate-in">
  <PageHeading eyebrow="OFFICIAL TIMETABLE" title={isMBBL?"MBBL Season 1 fixtures":"League, semis & final"} subtitle={isMBBL?"Five rounds and fifteen official ties across three courts. Knockouts follow the league rankings.":"Three courts, five league rounds of three team ties each."} actions={isMBBL?<Link className="btn" href="/mbbl">Meet the teams</Link>:undefined}/>
  {loading?<div className="panel empty" role="status">Loading official tournament schedule…</div>:error?<div className="error" role="alert">{error}</div>:isMBBL?
   <MBBLFixtureSchedule teams={teams}/>:
   <>{demo&&<div className="callout" style={{marginBottom:16}}>Sample fixture pairings; no dates or completed matches are invented.</div>}<div className="panel table-wrap"><table className="table"><thead><tr><th>Stage</th><th>Court</th><th>Teams</th><th>Rubber score</th><th>Status</th></tr></thead><tbody>{ties.map(t=><tr key={t.id}><td>{t.round}</td><td>Court {t.court_id}</td><td><strong>{t.side_a} vs {t.side_b}</strong></td><td>{t.score_a}–{t.score_b}</td><td><span className="badge">{t.status}</span></td></tr>)}</tbody></table></div></>}
 </div></Shell>;
}