const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const ts=require("typescript");
function loadModule(rel,dependencies={}){
 const filename=path.join(process.cwd(),"src/lib/mbbl",rel+".ts");
 const source=fs.readFileSync(filename,"utf8");
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const exported={};
 vm.runInNewContext(compiled,{exports:exported,module:{exports:exported},require:(id)=>{
  if(id.startsWith("./")){const dependency=dependencies[id.slice(2)];if(!dependency)throw Error("Unknown module "+id);return dependency;}
  throw Error("Unexpected dependency "+id);
 }},{filename});
 return exported;
}
const catalog=loadModule("catalog");
const rules=loadModule("rules",{catalog});
const sample=[
 [1,["A+","A1"]],[2,["A2","A3"]],[3,["B1","B2"]],[4,["B3","B4"]],
 [5,["C1","C2"]],[6,["C3","C4"]],[7,["K1","K2"]],[8,["W1","W2"]],[9,["G1","B5"]]
].map(([game,categories])=>({game,categories}));
test("six source posters supply exactly 108 players with all mandated categories",()=>{
 assert.equal(catalog.MBBL_TEAMS.length,6);
 assert.equal(new Set(catalog.MBBL_TEAMS.map(t=>t.slug)).size,6);
 for(const t of catalog.MBBL_TEAMS){
  assert.equal(t.players.length,18,t.name);
  assert.deepEqual([...t.players.map(p=>p.category)], [...catalog.MBBL_CATEGORY_ORDER]);
  assert.equal(rules.validateRoster(t.players).length,0,t.name);
 }
 assert.equal(catalog.MBBL_TEAMS.reduce((sum,t)=>sum+t.players.length,0),108);
});
test("nine game pair allocation uses every eligible category exactly once",()=>{
 assert.equal(rules.validateNinePairs(sample).length,0);
 const conflict=[...sample];conflict[8]={game:9,categories:["G1","B4"]};
 assert.ok(rules.validateNinePairs(conflict).some(issue=>issue.includes("B4")));
 assert.ok(rules.validateNinePairs(sample.slice(0,8)).some(issue=>issue.includes("Nine")));
});
test("K1 may partner W category if the remaining pair is eligible",()=>{
 const alt=sample.map(g=>g.game===7?{...g,categories:["K1","W1"]}:g.game===8?{...g,categories:["K2","W2"]}:g);
 assert.equal(rules.validateNinePairs(alt).length,0);
});
test("three separate Trump selections are required in league, two in semi, one in final",()=>{
 assert.equal(rules.validateTrumpSelections("league",[1,4,7]).length,0);
 assert.equal(rules.validateTrumpSelections("semifinal",[3,8]).length,0);
 assert.equal(rules.validateTrumpSelections("final",[2]).length,0);
 assert.ok(rules.validateTrumpSelections("league",[1,2]).length>0);
 assert.ok(rules.validateTrumpSelections("league",[1,1,2]).length>0);
});
test("winning all nine including 3 Trumps scores 12; other team reaches -3",()=>{
 const games=Array.from({length:9},(_,i)=>({
  number:i+1,scoreA:15,scoreB:8,trumpA:i<3,trumpB:i<3
 }));
 const res=rules.computeTiePoints(games);
 assert.equal(res.a,12);assert.equal(res.b,-3);assert.equal(res.winner,"a");
 assert.equal(res.gamesWonA,9);assert.equal(res.rallyPointsA,135);
});
test("each side's independent Trump choice affects only its own bonus or penalty",()=>{
 const res=rules.computeTiePoints([{number:1,scoreA:15,scoreB:11,trumpA:false,trumpB:true}]);
 assert.equal(res.a,1);assert.equal(res.b,-1);
});
test("forfeited Trump walkover gives 15-7 but no minus one to the forfeiting team",()=>{
 const res=rules.computeTiePoints([{number:1,scoreA:15,scoreB:7,trumpA:true,trumpB:true,walkoverBy:"b"}]);
 assert.equal(res.a,2);assert.equal(res.b,0);
 assert.throws(()=>rules.computeTiePoints([{number:1,scoreA:15,scoreB:8,trumpA:false,trumpB:true,walkoverBy:"b"}]));
});
test("an official discipline penalty subtracts one overall point",()=>{
 const res=rules.computeTiePoints([{number:1,scoreA:15,scoreB:10,trumpA:false,trumpB:false}],[{side:"a",amount:1,reason:"Conduct"}]);
 assert.equal(res.a,0);assert.equal(res.b,0);
});
test("league ranking: overall points, then games won, then rally difference; head-to-head not used",()=>{
 const a={teamId:"a",totalPoints:8,gamesWon:9,rallyDifference:12};
 const b={teamId:"b",totalPoints:8,gamesWon:9,rallyDifference:14};
 assert.ok(rules.compareLeagueRows(a,b)>0);
 assert.ok(rules.compareLeagueRows({...a, gamesWon:10},b)<0);
 assert.ok(rules.compareLeagueRows({...a,totalPoints:9},b)<0);
});
test("knockout relay stages change at first side reaching 10,20,30",()=>{
 assert.equal(rules.relayStage(9,8),0);
 assert.equal(rules.relayStage(10,6),1);
 assert.equal(rules.relayStage(13,20),2);
 assert.equal(rules.relayStage(30,27),3);
});
test("14-all uses two-point deuce, including beyond 30; no golden point",()=>{
 for(const [a,b] of [[14,14],[15,14],[15,15],[30,29],[30,30],[31,30]])assert.equal(rules.mbblGameWinner(a,b),null,`${a}-${b}`);
 for(const [a,b,winner] of [[15,13,"a"],[14,16,"b"],[17,15,"a"],[31,29,"a"],[30,32,"b"]]){
  assert.equal(rules.mbblGameWinner(a,b),winner);assert.equal(rules.isMBBLFinalScore(a,b),true);
 }
 assert.equal(rules.isMBBLFinalScore(16,12),false,"cannot continue after an earlier winning rally");
 assert.equal(rules.mbblGameWinner(-1,15),null);
});
test("Trump totals accept a deuce winner and reject a 15-14 golden point",()=>{
 const g={number:1,scoreA:18,scoreB:16,trumpA:true,trumpB:false};
 assert.equal(rules.computeTiePoints([g]).a,2);
 assert.throws(()=>rules.computeTiePoints([{...g,scoreA:15,scoreB:14}]),/two-point/);
});
