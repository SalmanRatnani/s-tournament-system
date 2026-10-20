// Node test: npm install && node --test tests/demo-scoring.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const local = new Map();
const hooks = {};
const sr=fs.readFileSync("src/lib/scoring-rules.ts","utf8");
const scoringModule={exports:{}};
vm.runInNewContext(ts.transpileModule(sr,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:scoringModule.exports,URL});
const context = {
  require:(name)=> name==="./scoring-rules" ? scoringModule.exports : require(name),
  console, process:{env:{}},
  window: {dispatchEvent(event){(hooks[event.type]||[]).forEach(fn=>fn())}},
  localStorage: {getItem(key){return local.get(key)||null},setItem(key,val){local.set(key,val)},removeItem(key){local.delete(key)}},
  Event:class{constructor(type){this.type=type}},structuredClone,Date,Map,
  exports:{},module:{exports:{}}
};
const src = fs.readFileSync('src/lib/demo.ts','utf8');
const compiled=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(compiled,context);
const {changeDemoScore,getDemoMatches,resetDemo}=context.exports;
test('point awards exactly one point and undo reverses',()=>{
  resetDemo();const a=getDemoMatches()[0];changeDemoScore(1,'a');assert.equal(getDemoMatches()[0].score_a,a.score_a+1);
  changeDemoScore(1,'a','undo');assert.equal(getDemoMatches()[0].score_a,a.score_a);
});
test('at 20-20 game requires two point difference and caps at 30',()=>{
  resetDemo();let all=getDemoMatches();all[0]={...all[0],score_a:20,score_b:20,games:[],current_game:1};local.set('s-tournament-demo-matches-v1',JSON.stringify(all));
  changeDemoScore(1,'a');assert.equal(getDemoMatches()[0].current_game,1);
  changeDemoScore(1,'a');assert.equal(getDemoMatches()[0].current_game,2);
  assert.equal(getDemoMatches()[0].games.length,1);
  resetDemo();all=getDemoMatches();all[0]={...all[0],score_a:29,score_b:29,games:[],current_game:1};local.set('s-tournament-demo-matches-v1',JSON.stringify(all));
  changeDemoScore(1,'b');assert.equal(getDemoMatches()[0].current_game,2);
  assert.equal(getDemoMatches()[0].games[0].b,30);
});
test('match completes when one side has two games and match-winning point is undoable',()=>{
  resetDemo();const all=getDemoMatches();all[0]={...all[0],score_a:20,score_b:17,games:[{a:21,b:15}],current_game:2};local.set('s-tournament-demo-matches-v1',JSON.stringify(all));
  changeDemoScore(1,'a');assert.equal(getDemoMatches()[0].status,'completed');assert.equal(getDemoMatches()[0].winner,'a');
  changeDemoScore(1,'a','undo');assert.equal(getDemoMatches()[0].status,'live');assert.equal(getDemoMatches()[0].winner,null);
});
