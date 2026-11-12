"use client";
import {useEffect,useMemo,useState} from "react";
import {usePublicEvent,createOverlayScoreStore,useOverlayScores} from "@/lib/use-public-scoreboard";
import {gamesWon,type Match} from "@/lib/types";
import {MBBL_TEAMS} from "@/lib/mbbl/catalog";
import {MBBL_EVENT_DATE_LABEL} from "@/lib/mbbl/fixtures";
import {chooseMBBLOverlaySlot,formatSlotTime,slotHeading} from "@/lib/mbbl/overlay-display";

const teamColor=(name:string)=>MBBL_TEAMS.find(t=>t.name.toLowerCase()===name.toLowerCase())?.accent||"#8ae4cc";
const readable=(name:string)=>name==="MB Baddy Group"?"MB Baddys":name;
const statusOrder:Record<Match["status"],number>={live:0,paused:1,scheduled:2,completed:3};
/** Signed, court-scoped fast scores; slow-changing event details remain cached. */
export default function OverlayClient({court,token}:{court:number;token:string}){
 const event=usePublicEvent(60000);
 const scoreStore=useMemo(()=>createOverlayScoreStore(court,token),[court,token]);
 const scores=useOverlayScores(scoreStore);
 const feed={...event,...scores.data,loading:event.loading||scores.loading,error:event.error||scores.error};
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{
  document.body.classList.add("overlay-body");
  const ticker=setInterval(()=>setNow(new Date()),15000);
  return()=>{document.body.classList.remove("overlay-body");clearInterval(ticker);};
 },[]);
 const relevant=feed.fixtures.filter(f=>f.court_id===court);
 const mbblPriority:Record<string,number>={live:0,paused:1,awaiting_relay:2,completed:3};
 const active=feed.mbblTies.filter(t=>t.court_id===court)
  .sort((a,b)=>(mbblPriority[a.status]??4)-(mbblPriority[b.status]??4))[0];
 const selected=chooseMBBLOverlaySlot(relevant,now);
 const fixture=active?relevant.find(f=>f.id===active.fixture_slot_id)||selected.slot:selected.slot;
 const activeGame=active?.games.find(g=>g.game_number===active.active_game);
 const byId=new Map(feed.teams.map(t=>[t.id,t.name]));
 const nameA=fixture?.team_a_id?byId.get(fixture.team_a_id)||"To be confirmed":fixture?.seed_a||"To be confirmed";
 const nameB=fixture?.team_b_id?byId.get(fixture.team_b_id)||"To be confirmed":fixture?.seed_b||"To be confirmed";
 const isMBBL=relevant.length>0||feed.mbblTies.some(t=>t.court_id===court);
 const sourceLabel=active?(active.status==="live"?"LIVE SCORE":active.status.toUpperCase()):fixture?(selected.phase==="window"?"SCHEDULED TIME":"UPCOMING FIXTURE"):"AWAITING FIXTURE";
 const standard=feed.matches.filter(m=>m.court_id===court&&m.kind!=="team_tie")
  .sort((a,b)=>statusOrder[a.status]-statusOrder[b.status]||Date.parse(b.updated_at)-Date.parse(a.updated_at))[0];
 return <div className="overlay-root mbbl-obs-root" aria-live="off">
  {isMBBL?<div className="mbbl-obs-panel" role="status" aria-label={"Court "+court+" broadcast fixture"}>
   <div className="mbbl-obs-header">
    <div className="mbbl-obs-brand"><span className="mbbl-obs-brand-square">S</span><div><strong>MIRA-BHAYANDAR</strong><span>BADMINTON LEAGUE · S1</span></div></div>
    <div className="mbbl-obs-court">COURT {String(court).padStart(2,"0")}</div>
   </div>
   <div className="mbbl-obs-stage"><span className="mbbl-obs-stage-dot"/><strong>{fixture?slotHeading(fixture):"TOURNAMENT BROADCAST"}</strong><span className="mbbl-obs-separator">/</span><span>{sourceLabel}</span></div>
   {fixture?<div className="mbbl-obs-matchup">
    <div className="mbbl-obs-team"><i style={{background:teamColor(nameA)}}/><strong>{readable(nameA)}</strong></div>
    <div className="mbbl-obs-vs">VS</div>
    <div className="mbbl-obs-team"><i style={{background:teamColor(nameB)}}/><strong>{readable(nameB)}</strong></div>
   </div>:<div className="mbbl-obs-empty">No court fixture currently selected</div>}
   <div className="mbbl-obs-score-row">
    <span>GAME {active?.active_game??"—"} / 9</span>
    <strong>{activeGame?activeGame.score_a:"—"} <small>:</small> {activeGame?activeGame.score_b:"—"}</strong>
    <span>TIE POINTS {active?active.overall_a:"—"} : {active?active.overall_b:"—"}</span>
   </div>
   <div className="mbbl-obs-footer">
    <span>{fixture?formatSlotTime(fixture.start_local)+" – "+formatSlotTime(fixture.end_local):MBBL_EVENT_DATE_LABEL}</span>
    <span>{feed.error?"UPDATES INTERRUPTED · LAST RECEIVED SCORE":active?.status==="live"?"OFFICIAL SCORE · WIN BY TWO":active?"MATCH "+active.status.toUpperCase():"OFFICIAL SCORE PENDING"}</span>
   </div>
   <div className="mbbl-obs-accent"/>
  </div>:<div className="overlay-score" role="status">
   {standard?<><div className="overlay-top"><span>S TOURNAMENT · COURT {court}</span><span>{standard.status.toUpperCase()}</span></div>
    <div className="overlay-name"><span>{standard.side_a}</span><div className="row"><span>{gamesWon(standard,"a")}</span><strong className="overlay-val">{standard.score_a}</strong></div></div>
    <div className="overlay-name"><span>{standard.side_b}</span><div className="row"><span>{gamesWon(standard,"b")}</span><strong className="overlay-val">{standard.score_b}</strong></div></div>
    <div className="overlay-foot"><span>{standard.round}</span><span>GAME {standard.current_game} / {standard.best_of}</span></div></>:
    <><div className="overlay-top"><span>S TOURNAMENT · COURT {court}</span><span>{feed.error?"FEED ERROR":"STANDBY"}</span></div>
    <div style={{padding:"18px 24px",minWidth:450}}><strong>{feed.loading?"CONNECTING TO SCORES":"WAITING FOR MATCH"}</strong><p>Official match information will appear here.</p></div></>}
  </div>}
 </div>;
}
