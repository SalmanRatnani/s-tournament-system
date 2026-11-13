/** Local workerd rehearsal only: never targets production or the real database. */
import assert from 'node:assert/strict';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import WebSocket from 'ws';
import {applyScoreDelta} from '../../src/lib/score-protocol.mjs';
const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const relayPort=18787;
const base=`http://127.0.0.1:${relayPort}`,origin='https://s-tournament-system.vercel.app';
const secret='local-test-only-not-a-production-secret-123456';
const stateDir=await mkdtemp(path.join(tmpdir(),'tournament-relay-test-'));
let sourceReads=0,sourceFails=false,runtime,version=1;
const clients=[];
const nextSnapshot=()=>({generatedAt:new Date().toISOString(),matches:[],mbblTies:[1,2,3].map(court=>({id:`tie-${court}`,version,score_a:version,score_b:0,court_id:court,games:[]})),standings:{rows:[]}});
let snapshot=nextSnapshot();
const compiled=await build({entryPoints:[path.join(directory,'src/worker.mjs')],bundle:true,write:false,format:'esm',platform:'neutral',external:['cloudflare:workers']});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=20_000){const end=Date.now()+timeout;while(!fn()){if(Date.now()>end)throw Error('Timed out waiting for expected relay state');await delay(20);}}
async function startWorker(){
 runtime=new Miniflare(convertV4MiniflareOptions({
  name:'score-relay-test',script:compiled.outputFiles[0].text,modules:true,
  compatibilityDate:'2026-11-12',port:relayPort,host:'127.0.0.1',cf:false,
  bindings:{ALLOWED_ORIGINS:origin,SOURCE_URL:'https://score-source.test/snapshot',PUBLISH_SECRET:secret,MAX_CONNECTIONS:'1200'},
  durableObjects:{SCORES:{className:'ScoreRoom',useSQLite:true}},resourcePersistencePath:stateDir,isolatedResourcePersistencePath:stateDir,
  outboundService:async request=>{
   assert.equal(request.url,'https://score-source.test/snapshot');sourceReads++;
   return new Response(sourceFails?'{}':JSON.stringify(snapshot),{status:sourceFails?503:200,headers:{'Content-Type':'application/json'}});
  }
 }));
 await runtime.ready;
}
async function stopWorker(){if(runtime){await runtime.dispose();runtime=null;}}
function connect(){return new Promise((resolve,reject)=>{
 const c={socket:new WebSocket(base.replace('http:','ws:')+'/scores',{origin}),data:null,revision:0,healthy:true,seenAt:0};
 const timeout=setTimeout(()=>reject(Error('Viewer connection timed out')),15000);
 c.socket.on('error',error=>{clearTimeout(timeout);reject(error);});
 c.socket.on('message',raw=>{try{
  const msg=JSON.parse(String(raw));
  if(msg.type==='status'){c.healthy=msg.healthy;return;}
  if(msg.type==='snapshot'){c.data=msg.data;c.revision=msg.revision;c.healthy=msg.sourceHealthy!==false;clearTimeout(timeout);resolve(c);}
  else if(msg.type==='update'){assert.equal(msg.previousRevision,c.revision);c.data=applyScoreDelta(c.data,msg.data);c.revision=msg.revision;c.seenAt=performance.now();}
 }catch(e){reject(e);c.error=e;}});
});}
async function publish(data=snapshot,authorization=secret){return fetch(base+'/publish',{method:'POST',headers:{Authorization:'Bearer '+authorization,'Content-Type':'application/json'},body:JSON.stringify(data)});}
async function addTo(count){while(clients.length<count)clients.push(...await Promise.all(Array.from({length:Math.min(25,count-clients.length)},()=>connect())));}
try{
 await startWorker();
 assert.equal((await publish(snapshot,'incorrect')).status,401,'unauthenticated score writes rejected');
 assert.equal((await fetch(base+'/scores',{headers:{Origin:'https://untrusted.example'}})).status,403);
 for(const count of [100,500,1000]){
  await addTo(count);const before=sourceReads,phase=[];
  for(let i=0;i<10;i++){
   version++;snapshot=nextSnapshot();const started=performance.now();assert.equal((await publish()).status,200);
   await until(()=>clients.every(c=>c.data.mbblTies[0].version===version));
   for(const c of clients){assert.ok(!c.error);phase.push(c.seenAt-started);}await delay(30);
  }
  phase.sort((a,b)=>a-b);
  console.log(JSON.stringify({viewers:count,updates:10,deliveries:count*10,p95Milliseconds:Math.round(phase[Math.floor(phase.length*.95)]),sharedSourceReadsDuringUpdates:sourceReads-before}));
 }
 const stale={...snapshot,generatedAt:new Date(Date.now()-60_000).toISOString(),mbblTies:snapshot.mbblTies.map(t=>({...t,version:1,score_a:1}))};
 assert.equal((await publish(stale)).status,200);
 for(const c of clients.splice(0,50))c.socket.close();
 const rejoined=await Promise.all(Array.from({length:50},()=>connect()));clients.push(...rejoined);
 assert.ok(rejoined.every(c=>c.data.mbblTies[0].version===version),'reconnect gets latest confirmed snapshot');
 const malicious=await connect();const rejected=new Promise(r=>malicious.socket.once('close',code=>r(code)));malicious.socket.send('change score');assert.equal(await rejected,1008);
 sourceFails=true;await until(()=>clients.every(c=>c.healthy===false),40_000);
 assert.ok(clients.every(c=>c.data.mbblTies[0].version===version),'source failure retains last confirmed score');
 for(const c of clients)c.socket.close();clients.length=0;await delay(100);await stopWorker();
 await startWorker();const restored=await connect();clients.push(restored);
 assert.equal(restored.data.mbblTies[0].version,version,'durable snapshot survives worker restart with source offline');assert.equal(restored.healthy,false);
 console.log(JSON.stringify({result:'PASS',reconnects:50,sourceFailure:'last score retained',restart:'snapshot restored',sharedSourceReads:sourceReads,notes:'Local workerd runtime; not a production latency or free-quota certification.'}));
}catch(error){console.error(error);console.error({sourceReads});process.exitCode=1;}
finally{for(const c of clients)c.socket.terminate();await stopWorker();await rm(stateDir,{recursive:true,force:true});}
