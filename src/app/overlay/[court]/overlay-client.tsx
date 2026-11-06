"use client";
import {useEffect,useMemo,useState} from "react";
import {useLiveCourt} from "@/lib/use-live-court";
import {gamesWon} from "@/lib/types";
import {supabaseBrowser} from "@/lib/supabase";
import {MBBL_TEAMS} from "@/lib/mbbl/catalog";
import {MBBL_EVENT_DATE_LABEL} from "@/lib/mbbl/fixtures";
import {chooseMBBLOverlaySlot,formatSlotTime,slotHeading,type MBBLFixtureSlot} from "@/lib/mbbl/overlay-display";

type TeamRow={id:string;name:string;tournament_id:string};
type BroadcastInfo={slots:MBBLFixtureSlot[];teams:TeamRow[]};
const teamColor=(name:string)=>MBBL_TEAMS.find(t=>t.name.toLowerCase()===name.toLowerCase())?.accent||"#8ae4cc";
const readableTeam=(name:string)=>name==="MB Baddy Group"?"MB Baddys":name;
/** Signed URL is checked by the server; this client reads only published fixture data.
 * Neither this graphic nor its browser source can mutate match scores.
 */
export default function OverlayClient({court}:{court:number}){
 const {match:m,loading:matchLoading,error:matchError}=useLiveCourt(court);
 const [broadcast,setBroadcast]=useState<BroadcastInfo|null>(null);
 const [scheduleLoading,setScheduleLoading]=useState(true);
 const [scheduleError,setScheduleError]=useState("");
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{document.body.classList.add("overlay-body");return()=>document.body.classList.remove("overlay-body");},[]);
 useEffect(()=>{
  const db=supabaseBrowser();
  if(!db){setScheduleLoading(false);setScheduleError("Connection unavailable");return;}
  let active=true;
  async function refresh(){
   const [fixtures,teams]=await Promise.all([
    db!.from("event_fixture_slots").select("id,tournament_id,stage,round_no,court_id,start_local,end_local,team_a_id,team_b_id,seed_a,seed_b,status").eq("published",true).order("start_local"),
    db!.from("teams").select("id,name,tournament_id")
   ]);
   if(!active)return;
   if(fixtures.error||teams.error){setScheduleError("Fixture feed temporarily unavailable");}
   else{
    const matchTeams=(teams.data||[]) as TeamRow[];
    const mbblIds=new Set(matchTeams.filter(t=>MBBL_TEAMS.some(v=>v.name.toLowerCase()===t.name.toLowerCase())).map(t=>t.tournament_id));
    const rows=((fixtures.data||[]) as MBBLFixtureSlot[]).filter(s=>mbblIds.has(s.tournament_id));
    setBroadcast({slots:rows,teams:matchTeams});
    setScheduleError("");
   }
   setScheduleLoading(false);
  }
  void refresh();
  const poll=window.setInterval(()=>{void refresh();},30000);
  const clock=window.setInterval(()=>setNow(new Date()),15000);
  return()=>{active=false;window.clearInterval(poll);window.clearInterval(clock);};
 },[]);
 const courtSlots=useMemo(()=>broadcast?.slots.filter(s=>s.court_id===court)||[],[broadcast,court]);
 const selection=useMemo(()=>chooseMBBLOverlaySlot(courtSlots,now),[courtSlots,now]);
 const slot=selection.slot;
 const byId=useMemo(()=>new Map(broadcast?.teams.map(t=>[t.id,t.name])||[]),[broadcast]);
 const isMBBL=Boolean(broadcast?.slots.length);
 const nameA=slot?.team_a_id?byId.get(slot.team_a_id)||"Team to confirm":slot?.seed_a||"To be confirmed";
 const nameB=slot?.team_b_id?byId.get(slot.team_b_id)||"Team to confirm":slot?.seed_b||"To be confirmed";
 const sourceLabel=slot?(selection.phase==="window"?"SCHEDULED TIME":"UPCOMING FIXTURE"):"AWAITING FIXTURE";
 return <div className="overlay-root mbbl-obs-root" aria-live="off">
  {isMBBL?<div className="mbbl-obs-panel" role="status" aria-label={"Court "+court+" broadcast fixture"}>
    <div className="mbbl-obs-header">
     <div className="mbbl-obs-brand"><span className="mbbl-obs-brand-square">S</span><div><strong>MIRA-BHAYANDAR</strong><span>BADMINTON LEAGUE · S1</span></div></div>
     <div className="mbbl-obs-court">COURT {String(court).padStart(2,"0")}</div>
    </div>
    <div className="mbbl-obs-stage"><span className="mbbl-obs-stage-dot"/><strong>{slot?slotHeading(slot):"TOURNAMENT BROADCAST"}</strong><span className="mbbl-obs-separator">/</span><span>{sourceLabel}</span></div>
    {slot?<div className="mbbl-obs-matchup">
      <div className="mbbl-obs-team"><i style={{background:teamColor(nameA)}}/><strong>{readableTeam(nameA)}</strong></div>
      <div className="mbbl-obs-vs">VS</div>
      <div className="mbbl-obs-team"><i style={{background:teamColor(nameB)}}/><strong>{readableTeam(nameB)}</strong></div>
    </div>:<div className="mbbl-obs-empty">No scheduled court fixture is currently selected</div>}
    <div className="mbbl-obs-score-row"><span>GAME — / 9</span><strong>— <small>:</small> —</strong><span>TIE POINTS — : —</span></div>
    <div className="mbbl-obs-footer"><span>{slot?formatSlotTime(slot.start_local)+" – "+formatSlotTime(slot.end_local):MBBL_EVENT_DATE_LABEL}</span><span>OFFICIAL SCORE PENDING</span></div>
    <div className="mbbl-obs-accent"/>
   </div>:<div className="overlay-score" role="status" aria-live="polite">
   {m?<><div className="overlay-top"><span>S TOURNAMENT • COURT {String(court).padStart(2,"0")}</span><span>{m.status.toUpperCase()}</span></div>
    <div className="overlay-name"><span>{m.side_a}</span><div className="row"><span style={{fontSize:14,color:"#9aafc5"}}>{gamesWon(m,"a")}</span><span key={"a-"+m.score_a} className={"overlay-val "+(m.score_a>m.score_b?"win":"")}>{m.score_a}</span></div></div>
    <div className="overlay-name" style={{borderTop:"1px solid #2a3c4e"}}><span>{m.side_b}</span><div className="row"><span style={{fontSize:14,color:"#9aafc5"}}>{gamesWon(m,"b")}</span><span key={"b-"+m.score_b} className={"overlay-val "+(m.score_b>m.score_a?"win":"")}>{m.score_b}</span></div></div>
    <div className="overlay-foot"><span>{m.round}</span><span>{m.status==="completed"?"MATCH FINAL":"GAME "+m.current_game+" • BEST OF "+m.best_of}</span></div></>:
   <><div className="overlay-top"><span>S TOURNAMENT • COURT {String(court).padStart(2,"0")}</span><span>{scheduleError||matchError?"CHECK FEED":scheduleLoading||matchLoading?"CONNECTING":"STANDBY"}</span></div>
    <div style={{padding:"16px 22px",minWidth:450,maxWidth:600}}><div style={{fontSize:18,fontWeight:800,letterSpacing:".6px"}}>{scheduleLoading||matchLoading?"CONNECTING TO TOURNAMENT":"WAITING FOR MATCH"}</div>
    <div style={{fontSize:13,color:"#abc0d4",marginTop:6}}>Published fixture previews load here once the schedule connection is available.</div></div></>}
   </div>}
 </div>;
}
