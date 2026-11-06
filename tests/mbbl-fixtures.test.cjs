const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const ts=require("typescript");
function loadModule(name){
 const filename=path.join(process.cwd(),"src/lib/mbbl",name+".ts");
 const js=ts.transpileModule(fs.readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const exports={};vm.runInNewContext(js,{exports,module:{exports},require(id){throw Error("Unexpected import: "+id);}}, {filename});
 return exports;
}
const fixture=loadModule("fixtures"),catalog=loadModule("catalog");
test("MBBL official poster defines five complete rounds and fifteen unique head-to-head fixtures",()=>{
 const slugs=catalog.MBBL_TEAMS.map(t=>t.slug);
 const issues=fixture.validateMBBLLeagueRounds(fixture.MBBL_LEAGUE_ROUNDS,slugs);
 assert.deepEqual([...issues],[]);
 assert.equal(fixture.MBBL_LEAGUE_ROUNDS.reduce((sum,r)=>sum+r.matches.length,0),15);
 const counts=new Map(slugs.map(s=>[s,0]));
 for(const r of fixture.MBBL_LEAGUE_ROUNDS)for(const f of r.matches){counts.set(f.home,counts.get(f.home)+1);counts.set(f.away,counts.get(f.away)+1);}
 assert.deepEqual([...counts.values()],[5,5,5,5,5,5]);
});
test("poster league slots show the exact court matchups and times",()=>{
 const expected=[
 ["08:30","10:00","tsar-strikers/mb-baddy-group","supreme-aces/bad-minions","shuttle-psychos/asha-smashers"],
 ["10:00","11:30","tsar-strikers/supreme-aces","mb-baddy-group/shuttle-psychos","bad-minions/asha-smashers"],
 ["11:30","13:00","tsar-strikers/bad-minions","mb-baddy-group/asha-smashers","supreme-aces/shuttle-psychos"],
 ["13:30","15:00","tsar-strikers/shuttle-psychos","mb-baddy-group/bad-minions","supreme-aces/asha-smashers"],
 ["15:00","16:30","tsar-strikers/asha-smashers","mb-baddy-group/supreme-aces","bad-minions/shuttle-psychos"]
 ];
 for(const [index,round] of fixture.MBBL_LEAGUE_ROUNDS.entries()){
  assert.deepEqual([round.start,round.end,...round.matches.map(m=>m.home+"/"+m.away)],expected[index]);
  assert.deepEqual([...round.matches.map(m=>m.court)],[1,2,3]);
 }
});
test("poster day timeline includes reporting, breakfast, ceremonies, lunch, semis and final",()=>{
 const events=fixture.MBBL_NON_MATCH_SCHEDULE;
 const byKey=(key)=>events.find(e=>e.key===key);
 assert.equal(byKey("reporting").time,"07:30");
 assert.equal(byKey("breakfast").end,"08:00");
 assert.equal(byKey("opening").end,"08:30");
 assert.equal(byKey("lunch").time,"13:00");
 assert.equal(byKey("lunch").end,"13:30");
 assert.equal(byKey("semifinals").time,"16:30");
 assert.equal(byKey("semifinals").end,"18:00");
 assert.equal(byKey("final").end,"19:30");
 assert.equal(byKey("closing").end,"21:00");
 assert.equal(fixture.MBBL_TIMEZONE,"Asia/Kolkata");
});
test("validator rejects duplicate pairing, repeated court and repeated team",()=>{
 const bad=fixture.MBBL_LEAGUE_ROUNDS.map(r=>({...r,matches:r.matches.map(m=>({...m}))}));
 bad[1].matches[0]={...bad[1].matches[0],away:"mb-baddy-group"};
 assert.ok(fixture.validateMBBLLeagueRounds(bad,catalog.MBBL_TEAMS.map(t=>t.slug)).length>0);
});
