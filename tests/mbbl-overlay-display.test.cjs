const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const ts=require("typescript");
const root=path.join(process.cwd(),"src/lib/mbbl");
function load(name,requires={}){
 const source=fs.readFileSync(path.join(root,name+".ts"),"utf8");
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const exports={};
 vm.runInNewContext(compiled,{module:{exports},exports,Date,Intl,require:(specifier)=>{
  const mod=requires[specifier];if(!mod)throw Error("Unexpected require "+specifier);
  return mod;
 }},{filename:name+".ts"});
 return exports;
}
const fixtures=load("fixtures");
const overlay=load("overlay-display",{"./fixtures":fixtures});
const slot=(id,court,start,end)=>({
 id,tournament_id:"mbbl-event",stage:"league",round_no:Number(id),court_id:court,start_local:start,end_local:end,
 team_a_id:"team-a",team_b_id:"team-b",seed_a:null,seed_b:null,status:"scheduled"
});
const slots=[slot("1",1,"08:30:00","10:00:00"),slot("2",1,"10:00:00","11:30:00")];
const instant=(time)=>new Date("2026-11-22T"+time+"+05:30");
test("before tournament date selects upcoming, never live",()=>{
 const result=overlay.chooseMBBLOverlaySlot(slots,new Date("2026-11-21T09:00:00+05:30"));
 assert.equal(result.phase,"next");assert.equal(result.slot.id,"1");
});
test("before morning start shows next planned match",()=>{
 const result=overlay.chooseMBBLOverlaySlot(slots,instant("07:45:00"));
 assert.equal(result.phase,"next");assert.equal(result.slot.id,"1");
});
test("during advertised slot shows scheduled window without claiming a live match",()=>{
 const result=overlay.chooseMBBLOverlaySlot(slots,instant("08:45:00"));
 assert.equal(result.phase,"window");assert.equal(result.slot.id,"1");
});
test("boundary time chooses the next court fixture",()=>{
 const result=overlay.chooseMBBLOverlaySlot(slots,instant("10:00:00"));
 assert.equal(result.phase,"window");assert.equal(result.slot.id,"2");
});
test("after final slot or after event day has no active fixture",()=>{
 assert.equal(overlay.chooseMBBLOverlaySlot(slots,instant("16:45:00")).phase,"finished");
 assert.equal(overlay.chooseMBBLOverlaySlot(slots,new Date("2026-11-23T11:00:00+05:30")).phase,"finished");
});
test("empty and cancelled schedules do not invent matchups",()=>{
 assert.equal(overlay.chooseMBBLOverlaySlot([],instant("09:00:00")).phase,"empty");
 const bad=[{...slots[0],status:"cancelled"}];
 assert.equal(overlay.chooseMBBLOverlaySlot(bad,instant("09:00:00")).slot,null);
});
test("shows IST and neutral stage labels",()=>{
 assert.equal(overlay.formatSlotTime("13:30:00"),"1:30 PM");
 assert.equal(overlay.slotHeading(slots[0]),"LEAGUE ROUND 1");
 assert.equal(overlay.slotHeading({...slots[0],stage:"final",round_no:null}),"GRAND FINAL");
});
