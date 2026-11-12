import {CourtCard} from "./court-card";
import type {PublicScoreSnapshot} from "@/lib/use-public-scoreboard";

export function PublicCourtScore({court,feed}:{court:number;feed:PublicScoreSnapshot}){
 const priority:Record<string,number>={live:0,paused:1,awaiting_relay:2,completed:3};
 const tie=feed.mbblTies.filter(t=>t.court_id===court).sort((a,b)=>(priority[a.status]??4)-(priority[b.status]??4)||Date.parse(b.updated_at)-Date.parse(a.updated_at))[0];
 if(tie){
  const name=(id:string)=>feed.teams.find(t=>t.id===id)?.name||"Team";
  return <div className="panel court-card">
   <div className="court-top"><strong>COURT {String(court).padStart(2,"0")}</strong><span className={"badge "+tie.status}>{tie.status.toUpperCase()}</span></div>
   <div className="court-caption">MBBL · GAME {tie.active_game} / 9 · WIN BY TWO</div>
   <div className="players"><div className="player-row"><span className="player-name">{name(tie.team_a_id)}</span><strong className="score-numbers">{tie.score_a}</strong></div><div className="player-row"><span className="player-name">{name(tie.team_b_id)}</span><strong className="score-numbers">{tie.score_b}</strong></div></div>
   <div className="court-footer">Overall team points: {tie.overall_a} – {tie.overall_b}</div>
  </div>;
 }
 const match=feed.matches.filter(m=>m.court_id===court&&m.kind!=="team_tie").sort((a,b)=>(priority[a.status]??4)-(priority[b.status]??4)||Date.parse(b.updated_at)-Date.parse(a.updated_at))[0];
 return match?<CourtCard m={match}/>:<div className="panel panel-pad"><strong>Court {court}</strong><p className="help-note" style={{marginTop:14}}>Waiting for the Main Controller to start a match.</p></div>;
}
