const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./helpers/load-ts.cjs');
const protocol=load('src/lib/score-protocol.mjs');
const snapshot=(version=1)=>({generatedAt:new Date(1_000_000+version).toISOString(),matches:[],mbblTies:[{id:'court-1',version,score_a:version}],standings:{rows:[]}});
const flush=async()=>{for(let n=0;n<20;n++)await Promise.resolve();};
function browser(){
 let clock=1_000_000,id=0,requests=0;
 const timers=new Map(),events=new Map(),sockets=[];
 const surface={addEventListener:(name,fn)=>{if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);},removeEventListener:(name,fn)=>events.get(name)?.delete(fn)};
 const document={...surface,visibilityState:'visible'},navigator={onLine:true};
 class WS{static OPEN=1;constructor(url){this.url=url;this.readyState=0;this.sent=[];sockets.push(this);}send(v){this.sent.push(v);}close(){this.readyState=3;}message(data){this.readyState=1;this.onmessage?.({data:typeof data==='string'?data:JSON.stringify(data)});}drop(){this.readyState=3;this.onclose?.();}}
 const globals={document,navigator,window:surface,WebSocket:WS,Date:class extends Date{static now(){return clock;}},Math:Object.assign(Object.create(Math),{random:()=>.5}),
 fetch:async()=>{requests++;return {ok:true,json:async()=>snapshot(1)};},setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:clock+ms});return id;},clearTimeout:id=>timers.delete(id)};
 const {createLiveScoreStore}=load('src/lib/live-score-store.ts',globals,{'./score-protocol.mjs':protocol});
 const store=createLiveScoreStore({matches:[],mbblTies:[]});
 return {store,sockets,document,navigator,timers,get requests(){return requests;},emit:name=>events.get(name)?.forEach(fn=>fn()),async advance(ms){clock+=ms;for(const [id,t]of [...timers])if(t.at<=clock){timers.delete(id);t.fn();}await flush();}};
}
test('many components share one socket; healthy push disables periodic HTTP polling',async()=>{
 const b=browser();b.store.configure('wss://scores.example/scores');const a=b.store.subscribe(()=>{}),c=b.store.subscribe(()=>{});await flush();
 assert.equal(b.sockets.length,1);assert.equal(b.requests,1);
 b.sockets[0].message({type:'snapshot',revision:1,data:snapshot(1)});
 for(let i=0;i<10;i++){await b.advance(25_000);b.sockets[0].message('pong');}
 assert.equal(b.requests,1);assert.equal(b.store.getDelivery(),'live');
 a();c();assert.equal(b.timers.size,0);assert.equal(b.sockets[0].readyState,3);
});
test('delta updates are applied, skipped revisions reconnect, and old HTTP cannot regress scores',async()=>{
 const b=browser();b.store.configure('wss://scores.example/scores');const stop=b.store.subscribe(()=>{});await flush();
 const socket=b.sockets[0];socket.message({type:'snapshot',revision:1,data:snapshot(1)});
 socket.message({type:'update',previousRevision:1,revision:2,data:protocol.scoreDelta(snapshot(1),snapshot(2))});
 assert.equal(b.store.getSnapshot().data.mbblTies[0].version,2);
 await b.store.refresh();assert.equal(b.store.getSnapshot().data.mbblTies[0].version,2);
 socket.message({type:'update',previousRevision:3,revision:4,data:{}});
 assert.equal(b.store.getDelivery(),'fallback');await b.advance(1500);assert.equal(b.sockets.length,2);stop();
});
test('offline/hidden tabs stop connections and foreground resumes a fresh socket',async()=>{
 const b=browser();b.store.configure('wss://scores.example/scores');const stop=b.store.subscribe(()=>{});await flush();
 b.sockets[0].message({type:'snapshot',revision:1,data:snapshot(1)});
 b.document.visibilityState='hidden';b.emit('visibilitychange');await b.advance(60_000);
 assert.equal(b.sockets[0].readyState,3);assert.equal(b.requests,1);
 b.document.visibilityState='visible';b.emit('visibilitychange');await flush();assert.equal(b.sockets.length,2);
 b.navigator.onLine=false;b.emit('offline');assert.equal(b.store.getDelivery(),'offline');stop();
});
test('no configured relay uses a bounded 30-second automatic fallback',async()=>{
 const b=browser(),stop=b.store.subscribe(()=>{});await flush();
 await b.advance(29_000);assert.equal(b.requests,1);await b.advance(2000);assert.equal(b.requests,2);assert.equal(b.store.getDelivery(),'fallback');stop();
});
test('upstream failure changes live indicator and resumes fallback while retaining confirmed data',async()=>{
 const b=browser();b.store.configure('wss://scores.example/scores');const stop=b.store.subscribe(()=>{});await flush();
 b.sockets[0].message({type:'snapshot',revision:1,data:snapshot(5)});
 b.sockets[0].message({type:'status',healthy:false});assert.equal(b.store.getDelivery(),'fallback');
 await b.advance(31_000);assert.equal(b.requests,2);assert.equal(b.store.getSnapshot().data.mbblTies[0].version,5);
 b.sockets[0].message({type:'status',healthy:true});assert.equal(b.store.getDelivery(),'live');stop();
});
test('versions prevent regression within one millisecond; removals and standings patch together',()=>{
 const a=snapshot(2),b={...snapshot(1),generatedAt:a.generatedAt};assert.equal(protocol.scoreSnapshotIsNewer(b,a),false);
 const next={...snapshot(3),mbblTies:[],standings:{rows:[{rank:1}]}};
 assert.equal(JSON.stringify(protocol.applyScoreDelta(a,protocol.scoreDelta(a,next))),JSON.stringify(next));
 assert.equal(protocol.scoreDelta(a,{...a,generatedAt:new Date().toISOString()}),null);
});
