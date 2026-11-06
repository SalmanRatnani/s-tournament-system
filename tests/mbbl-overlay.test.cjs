const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const ts=require("typescript");
const file=fs.readFileSync(path.join(process.cwd(),"src/lib/mbbl/overlay-display.ts"),"utf8");
const compiled=ts.transpileModule(file,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exports={};
vm.runInNewContext(compiled,{exports,module:{exports},require:(id)=>id==="./fixtures"?{MBBL_EVENT_DATE:"2026-11-22",MBBL_TIMEZONE:"Asia/Kolkata"}:(()=>{throw Error(id)})(),Intl,Date},{filename:"overlay-display.ts"});
const {chooseMBBLOverlaySlot,formatSlotTime,slotHeading}=exports;
const slots=[
 {id:"a",stage:"league",round_no:1,start_local:"08:30:00",end_local:"10:00:00",court_id:1,status:"scheduled"},
 {id:"b",stage:"league",round_no:2,start_local:"10:00:00",end_local:"11:30:00",court_id:1,status:"scheduled"},
 {id:"c",stage:"league",round_no:3,start_local:"11:30:00",end_local:"13:00:00",court_id:1,status:"scheduled"}
];
const at=(day,time)=>new Date(day+"T"+time+"+05:30");
test("Before tournament day show first scheduled matchup, not fake LIVE",()=>{
 const result=chooseMBBLOverlaySlot(slots,at("2026-11-06","14:00:00"));
 assert.equal(result.slot.id,"a");assert.equal(result.phase,"next");
});
test("Court displays scheduled window, between-slot matchup, and clears after day",()=>{
 assert.equal(chooseMBBLOverlaySlot(slots,at("2026-11-22","08:30:00")).slot.id,"a");
 assert.equal(chooseMBBLOverlaySlot(slots,at("2026-11-22","09:00:00")).phase,"window");
 assert.equal(chooseMBBLOverlaySlot(slots,at("2026-11-22","10:00:00")).slot.id,"b");
 assert.equal(chooseMBBLOverlaySlot(slots,at("2026-11-22","13:05:00")).phase,"finished");
 assert.equal(chooseMBBLOverlaySlot(slots,at("2026-11-23","08:30:00")).slot,null);
});
test("Cancelled slots are skipped and empty schedule is safe",()=>{
 const result=chooseMBBLOverlaySlot([{...slots[0],status:"cancelled"},slots[1]],at("2026-11-20","08:30:00"));
 assert.equal(result.slot.id,"b");
 assert.equal(chooseMBBLOverlaySlot([],at("2026-11-22","09:00:00")).phase,"empty");
});
test("Presenter uses stage/time labels, never implies game is live",()=>{
 assert.equal(slotHeading(slots[0]),"LEAGUE ROUND 1");
 assert.equal(formatSlotTime("16:30:00"),"4:30 PM");
});
