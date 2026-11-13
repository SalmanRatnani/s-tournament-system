const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./helpers/load-ts.cjs');
const {calculateMBBLStandings}=load('src/lib/mbbl/standings.ts');
const teams=Array.from({length:6},(_,i)=>({id:String(i),name:'Team '+i,tournament_id:'event'}));
const fixture=(id,a,b,stage='league')=>({id,tournament_id:'event',stage,team_a_id:String(a),team_b_id:String(b),status:'scheduled'});
const game=(n,a,b,status='completed')=>({game_number:n,score_a:a,score_b:b,status});
const tie=(f,props={})=>({id:'tie'+f.id,fixture_slot_id:f.id,tournament_id:'event',team_a_id:f.team_a_id,team_b_id:f.team_b_id,status:'paused',overall_a:0,overall_b:0,games:[],...props});
test('standings start with all six real teams at zero and no fabricated qualification',()=>{
 const s=calculateMBBLStandings(teams,[fixture('one',0,1)],[]);
 assert.equal(s.rows.length,6);assert.equal(s.hasResults,false);assert.equal(s.leagueComplete,false);
 assert.ok(s.rows.every(r=>r.totalPoints===0&&r.tied&&!r.qualified));
});
test('confirmed game statistics use authoritative Trump/penalty totals; live rallies do not count',()=>{
 const f=fixture('one',0,1);
 const s=calculateMBBLStandings(teams,[f],[tie(f,{overall_a:1,overall_b:-1,games:[game(1,16,14),game(2,99,98,'live')]})]);
 const a=s.rows.find(r=>r.teamId==='0'),b=s.rows.find(r=>r.teamId==='1');
 assert.equal(a.totalPoints,1,'official total may already include a penalty');assert.equal(b.totalPoints,-1);
 assert.equal(a.gamesWon,1);assert.equal(a.gamesPlayed,1);assert.equal(a.rallyDifference,2);assert.equal(b.rallyDifference,-2);
 assert.equal(a.played,0,'unfinished tie is not marked played');
});
test('league table excludes knockouts, cancelled slots, mismatched identities and duplicate ties',()=>{
 const f=fixture('one',0,1),semi=fixture('semi',0,1,'semifinal'),cancelled={...fixture('cancel',0,1),status:'cancelled'};
 const t=tie(f,{status:'completed',overall_a:3,games:[game(1,15,7,'walkover')]});
 const s=calculateMBBLStandings(teams,[f,semi,cancelled],[t,t,tie(semi,{overall_a:99}),tie(cancelled,{overall_a:99}),{...t,id:'foreign',tournament_id:'other'}]);
 assert.equal(s.rows.find(r=>r.teamId==='0').totalPoints,3);assert.equal(s.completedTies,1);assert.equal(s.rows.find(r=>r.teamId==='0').gamesPlayed,1);
});
test('equal ranking keys share rank and do not alphabetically assign playoff seeds',()=>{
 const f=fixture('one',0,1),s=calculateMBBLStandings(teams,[f],[tie(f,{overall_a:1,overall_b:1,games:[game(1,15,10),game(2,10,15)]})]);
 const top=s.rows.slice(0,2);assert.ok(top.every(r=>r.rank===1&&r.tied));assert.equal(s.rows[2].rank,3);
});
test('15 complete league ties are required; a fourth-place equality cannot qualify both teams',()=>{
 const fixtures=[];for(let a=0;a<6;a++)for(let b=a+1;b<6;b++)fixtures.push(fixture(a+'-'+b,a,b));
 const ties=fixtures.map(f=>tie(f,{status:'completed',overall_a:0,overall_b:0,games:[]}));
 const s=calculateMBBLStandings(teams,fixtures,ties);
 assert.equal(s.leagueComplete,true);assert.ok(s.rows.every(r=>r.played===5&&r.rank===1&&!r.qualified));
 assert.equal(calculateMBBLStandings(teams,fixtures,ties.slice(1)).leagueComplete,false);
});
