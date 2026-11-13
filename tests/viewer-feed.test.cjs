const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file,globals={}){
 const exports={};
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(source,{exports,module:{exports},AbortController,setTimeout,clearTimeout,...globals});
 return exports;
}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function browser(fetch){
 let time=0,id=0;const timers=new Map(),events=new Map();
 const surface={addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:(key)=>events.delete(key)};
 const document={...surface,visibilityState:'visible'};
 const navigator={onLine:true};
 const {createSnapshotStore}=load('src/lib/snapshot-store.ts',{fetch,document,navigator,window:surface,Math:Object.assign(Object.create(Math),{random:()=>0}),
  setTimeout:(fn,delay)=>{timers.set(++id,{at:time+delay,fn});return id;},clearTimeout:key=>timers.delete(key)});
 return {createSnapshotStore,document,navigator,events,timers,async advance(ms){time+=ms;for(const [key,t] of [...timers])if(t.at<=time){timers.delete(key);t.fn();}await flush();}};
}
test('a manual snapshot resource loads once and shares requests without ongoing polls',async()=>{
 let requests=0,resolve;
 const b=browser(()=>{requests++;return new Promise(r=>resolve=r);});
 const store=b.createSnapshotStore({url:'/api/public/event',initial:{courts:[]}});
 const stopA=store.subscribe(()=>{}),stopB=store.subscribe(()=>{});
 assert.equal(requests,1);
 resolve({ok:true,json:async()=>({courts:[{id:1}]})});await flush();
 await b.advance(8*60*60*1000);
 assert.equal(requests,1,'eight hours of watching creates no repeat API calls');
 assert.equal(store.getSnapshot().data.courts[0].id,1);
 stopA();stopB();assert.equal(b.timers.size,0);
});
test('OBS has one shared fast timer, pauses in a hidden tab, and resumes',async()=>{
 let requests=0;
 const b=browser(async()=>{requests++;return {ok:true,json:async()=>({score:requests})};});
 const store=b.createSnapshotStore({url:'/api/overlay/1/scoreboard',initial:{score:0}});
 const a=store.subscribe(()=>{},1000),c=store.subscribe(()=>{},5000);await flush();
 await b.advance(1000);assert.equal(requests,2);
 b.document.visibilityState='hidden';b.events.get('visibilitychange')();await b.advance(60000);assert.equal(requests,2);
 b.document.visibilityState='visible';b.events.get('visibilitychange')();await flush();assert.equal(requests,3);
 a();c();await b.advance(60000);assert.equal(requests,3);
});
test('failed refresh keeps the confirmed score and uses exponential backoff',async()=>{
 let requests=0;
 const b=browser(async()=>{requests++;return requests===1?{ok:true,json:async()=>({score:14})}:{ok:false};});
 const store=b.createSnapshotStore({url:'/scores',initial:{score:0}});
 const stop=store.subscribe(()=>{},1000);await flush();
 await b.advance(1000);assert.equal(requests,2);assert.equal(store.getSnapshot().data.score,14);
 assert.ok(store.getSnapshot().error);
 await b.advance(1000);assert.equal(requests,2);
 await b.advance(1000);assert.equal(requests,3);stop();
});
test('an older response cannot overwrite a newer score snapshot',async()=>{
 let calls=0;
 const b=browser(async()=>({ok:true,json:async()=>({version:++calls===1?4:3})}));
 const store=b.createSnapshotStore({url:'/scores',initial:{version:0},accept:(n,p)=>n.version>=p.version});
 const stop=store.subscribe(()=>{});await flush();await store.refresh();
 assert.equal(store.getSnapshot().data.version,4);stop();
});
test('lost score response retries the same request ID and expected version',async()=>{
 const bodies=[];
 const {sendMBBLCommand}=load('src/lib/score-command.ts',{fetch:async(_url,init)=>{
  bodies.push(init.body);if(bodies.length===1)throw Error('connection reset');
  return {ok:true,json:async()=>({result:{score_a:15,score_b:14,version:29,replayed:true}})};
 }});
 const command={tieId:'tie',game:1,side:'a',action:'point',requestId:'one-command',expectedVersion:28};
 const result=await sendMBBLCommand(command,'test-token');
 assert.equal(bodies.length,2);assert.equal(bodies[0],bodies[1]);assert.equal(result.replayed,true);
});
test('known stale-score rejection is not retried; total network failure stays uncertain',async()=>{
 let calls=0;
 const rejected=load('src/lib/score-command.ts',{fetch:async()=>{calls++;return {ok:false,status:409,json:async()=>({error:'Stale tie version'})};}});
 await assert.rejects(rejected.sendMBBLCommand({},'token'),e=>e.uncertain===false);assert.equal(calls,1);
 const failed=load('src/lib/score-command.ts',{fetch:async()=>{throw Error('offline');}});
 await assert.rejects(failed.sendMBBLCommand({},'token'),e=>e.uncertain===true);
});
test('API preserves uncertainty when the database response is lost, but reports a definite rule rejection',async()=>{
 let databaseError={code:'',message:'Fetch failed'};
 const {POST}=load('src/app/api/mbbl/score/route.ts',{require:name=>{
  if(name==='@/lib/score-publisher')return {scheduleScorePublish:()=>{}};
  if(name==='next/server')return {NextResponse:{json:(body,init)=>({body,...init})}};
  if(name==='@/lib/auth')return {authorize:async()=>({role:'owner',user:{id:'owner'},db:{rpc:async()=>({data:null,error:databaseError})}})};
  throw Error('Unexpected import '+name);
 }});
 const request={json:async()=>({tieId:'11111111-1111-1111-1111-111111111111',requestId:'22222222-2222-2222-2222-222222222222',game:1,side:'a',action:'point',expectedVersion:28})};
 assert.equal((await POST(request)).status,503,'unknown commit outcome must be retried safely');
 databaseError={code:'P0001',message:'Stale tie version'};
 assert.equal((await POST(request)).status,409,'a known version rejection allows resynchronisation');
});
