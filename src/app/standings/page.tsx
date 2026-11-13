"use client";
import Link from "next/link";
import {Shell,PageHeading} from "@/components/shell";
import {ScoreFeedStatus} from "@/components/score-feed-status";
import {calculateStandings} from "@/lib/tournament";
import {useTournamentPublic} from "@/lib/use-tournament-public";

export default function Standings(){
 const feed=useTournamentPublic();
 const {teams,ties,demo,error,standings,loading}=feed;
 const mbbl=feed.fixtures.some(f=>f.stage==="league")||Boolean(standings?.rows.length);
 const legacy=mbbl?[]:calculateStandings(teams,ties);
 return <Shell title="LEAGUE STANDINGS" mode="public"><div className="content animate-in">
  <PageHeading eyebrow="ROUND ROBIN" title="League standings" subtitle="Six teams, five rounds, top four advance to the semifinals."/>
  {demo&&<div className="callout" style={{marginBottom:20}}>Sample-only league preview. Actual standings follow confirmed match results.</div>}
  {error&&<p className="error" role="alert">{error}</p>}
  {!demo&&<ScoreFeedStatus delivery={feed.delivery} receivedAt={feed.receivedAt}/>}
  {loading?<p role="status" className="panel empty">Loading league standings…</p>:mbbl&&standings?<>
   <div className="callout" style={{margin:"20px 0"}}><strong>{standings.leagueComplete?"League results complete":standings.hasResults?"Live provisional standings":"League not started"}</strong><p className="help-note">{standings.completedTies} / {standings.scheduledTies} league ties completed. Points, games won and rally difference include confirmed game results; an unfinished game's rallies do not count here.</p></div>
   <div className="panel table-wrap"><table className="table"><caption className="help-note" style={{textAlign:"left",padding:16}}>MBBL Season 1 · Overall team points include Trump awards, deductions and recorded penalties.</caption><thead><tr><th scope="col">Rank</th><th scope="col">Team</th><th scope="col">Ties played</th><th scope="col">Games won</th><th scope="col">Rally difference</th><th scope="col">Overall points</th></tr></thead><tbody>{standings.rows.map(row=><tr key={row.teamId}>
    <td><span className={`badge ${row.qualified?"live":"scheduled"}`}>{!standings.hasResults?"—":`${row.tied?"=":""}${row.rank}`}</span></td><td><strong>{row.teamName}</strong>{row.qualified&&<div className="help-note">Qualified</div>}{standings.leagueComplete&&row.tied&&<div className="help-note">Best vs Best required for rank order</div>}</td><td>{row.played}</td><td>{row.gamesWon} / {row.gamesPlayed}</td><td>{row.rallyDifference>0?"+":""}{row.rallyDifference}</td><td><strong>{row.totalPoints}</strong></td>
   </tr>)}</tbody></table></div>
   <p className="footer-note">Ranking: overall team points → games won → aggregate rally-point difference. Equal teams share a rank until the official 21-point Best vs Best decider. Display order does not break a tie. Semifinal and final results do not change this league table.</p>
  </>:mbbl?<div className="panel empty" role="status">Waiting for the official MBBL standings feed.</div>:<><div className="panel table-wrap"><table className="table"><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>Rubbers won</th><th>Difference</th><th>Pts</th></tr></thead><tbody>{legacy.map((r,i)=><tr key={r.team.id}><td>{i+1}</td><td><strong>{r.team.name}</strong></td><td>{r.played}</td><td>{r.wins}</td><td>{r.losses}</td><td>{r.rubbersFor}</td><td>{r.difference}</td><td>{r.points}</td></tr>)}</tbody></table></div><p className="footer-note">Standard format: two points per tie victory. MBBL uses its separate overall-points rules.</p></>}
  <Link href="/knockouts" className="btn">View playoff bracket</Link>
 </div></Shell>;
}
