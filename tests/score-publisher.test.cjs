const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./helpers/load-ts.cjs');
test('publishing runs after response, retries bounded failures and never throws into scoring',async()=>{
 let callback,calls=0,invalidations=0;
 const p=load('src/lib/score-publisher.ts',{process:{env:{PUBLIC_SCORE_RELAY_URL:'https://scores.example',SCORE_RELAY_PUBLISH_SECRET:'local-test-value-not-a-real-secret-1234',NODE_ENV:'production'}},AbortSignal,fetch:async()=>{calls++;throw Error('offline');},console:{warn:()=>{}}},{
 'next/server':{after:fn=>callback=fn},'next/cache':{revalidateTag:()=>invalidations++},'./public-feed-server':{readPublicScores:async()=>({matches:[],mbblTies:[]})}
 });
 p.scheduleScorePublish();assert.equal(calls,0);assert.equal(invalidations,1);await callback();assert.equal(calls,2);
 assert.equal(p.publicScoreSocketUrl(),'wss://scores.example/scores');
});
test('cache invalidation failure cannot change the result of an already committed point',()=>{
 const p=load('src/lib/score-publisher.ts',{process:{env:{}},console:{warn:()=>{}}},{'next/server':{after:()=>{}},'next/cache':{revalidateTag:()=>{throw Error('cache unavailable');}},'./public-feed-server':{}});
 assert.doesNotThrow(()=>p.scheduleScorePublish());
});
