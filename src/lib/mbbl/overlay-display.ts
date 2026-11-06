/** Broadcast-safe MBBL slot selector.
 * The published timetable is informational, NOT a declaration that a match
 * is live, and never supplies official scores or Trump designations.
 */
import {MBBL_EVENT_DATE,MBBL_TIMEZONE} from "./fixtures";
export type MBBLFixtureSlot={
 id:string;tournament_id:string;stage:"league"|"semifinal"|"final";
 round_no:number|null;court_id:number|null;start_local:string;end_local:string;
 team_a_id:string|null;team_b_id:string|null;seed_a:string|null;seed_b:string|null;
 status:"scheduled"|"delayed"|"cancelled";
};
export type SlotPhase="next"|"window"|"finished"|"empty";
export type SlotSelection={slot:MBBLFixtureSlot|null;phase:SlotPhase};
function localClock(now:Date){
 const parts=new Intl.DateTimeFormat("en-GB",{
  timeZone:MBBL_TIMEZONE,year:"numeric",month:"2-digit",day:"2-digit",
  hour:"2-digit",minute:"2-digit",hourCycle:"h23"
 }).formatToParts(now);
 const value=(type:string)=>parts.find(x=>x.type===type)?.value||"00";
 return {day:value("year")+"-"+value("month")+"-"+value("day"),time:value("hour")+":"+value("minute")};
}
/** The next planned or currently scheduled slot; does not imply gameplay status. */
export function chooseMBBLOverlaySlot(slots:readonly MBBLFixtureSlot[],now=new Date()):SlotSelection{
 const eligible=slots.filter(s=>s.status!=="cancelled").slice()
  .sort((a,b)=>a.start_local.localeCompare(b.start_local)||(a.court_id??0)-(b.court_id??0));
 if(!eligible.length)return {slot:null,phase:"empty"};
 const clock=localClock(now);
 if(clock.day<MBBL_EVENT_DATE)return {slot:eligible[0],phase:"next"};
 if(clock.day>MBBL_EVENT_DATE)return {slot:null,phase:"finished"};
 const within=eligible.find(s=>clock.time>=s.start_local.slice(0,5)&&clock.time<s.end_local.slice(0,5));
 if(within)return {slot:within,phase:"window"};
 const upcoming=eligible.find(s=>s.start_local.slice(0,5)>clock.time);
 return upcoming?{slot:upcoming,phase:"next"}:{slot:null,phase:"finished"};
}
export function formatSlotTime(time:string){
 const [hour,minute]=time.slice(0,5).split(":").map(Number);
 return (hour%12||12)+":"+String(minute).padStart(2,"0")+(hour>=12?" PM":" AM");
}
export function slotHeading(slot:MBBLFixtureSlot){
 if(slot.stage==="league")return "LEAGUE ROUND "+(slot.round_no??"—");
 if(slot.stage==="semifinal")return "SEMIFINAL";
 return "GRAND FINAL";
}
