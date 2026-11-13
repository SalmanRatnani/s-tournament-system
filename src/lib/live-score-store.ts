import {createSnapshotStore} from "./snapshot-store";
import {applyScoreDelta,isScoreSnapshot,scoreSnapshotIsNewer} from "./score-protocol.mjs";
import type {PublicScores} from "./use-public-scoreboard";

export type ScoreDelivery="connecting"|"live"|"fallback"|"offline";
const FALLBACK_MS=30_000;

/** One read-only socket per tab. Reconnects replay a complete snapshot. */
export function createLiveScoreStore(initial:PublicScores){
 const store=createSnapshotStore<PublicScores>({url:"/api/public/scoreboard",initial,
  accept:scoreSnapshotIsNewer});
 let url="",socket:WebSocket|null=null,retry:ReturnType<typeof setTimeout>|undefined,heartbeat:ReturnType<typeof setTimeout>|undefined;
 let consumers=0,failures=0,lastMessage=0,revision:number|null=null,wireState:PublicScores|null=null;
 let delivery:ScoreDelivery="fallback";
 const notices=new Set<()=>void>();
 const available=()=>document.visibilityState!=="hidden"&&navigator.onLine!==false;
 const notify=(next:ScoreDelivery)=>{if(delivery!==next){delivery=next;notices.forEach(fn=>fn());}};
 const cancelTimers=()=>{clearTimeout(retry);clearTimeout(heartbeat);retry=undefined;heartbeat=undefined;};
 const disconnect=()=>{
  cancelTimers();const current=socket;socket=null;revision=null;wireState=null;
  if(current){current.onclose=null;current.onerror=null;current.onmessage=null;current.onopen=null;current.close();}
 };
 const scheduleRetry=()=>{
  if(!consumers||!url||!available())return;
  clearTimeout(retry);
  retry=setTimeout(connect,Math.min(60_000,1000*2**Math.min(failures++,6))*(.75+Math.random()*.5));
 };
 const failed=()=>{
  disconnect();store.setPollingEnabled(true);
  notify(navigator.onLine===false?"offline":"fallback");scheduleRetry();
 };
 const ping=()=>{
  if(!socket||!available())return;
  // A silent half-open connection must not leave a false "live" indicator.
  if(Date.now()-lastMessage>50_000){failed();return;}
  if(socket.readyState===WebSocket.OPEN)socket.send("ping");
  heartbeat=setTimeout(ping,25_000);
 };
 function connect(){
  if(socket||!consumers||!url||!available())return;
  notify("connecting");
  try{socket=new WebSocket(url);}catch{failed();return;}
  const current=socket;
  // Includes DNS/TLS/handshake and receipt of the authoritative initial snapshot.
  retry=setTimeout(()=>{if(socket===current)failed();},10_000);
  current.onmessage=event=>{
   if(socket!==current)return;
   lastMessage=Date.now();
   if(event.data==="pong")return;
   try{
    if(typeof event.data!=="string"||event.data.length>300_000)throw Error("Invalid feed");
    const message=JSON.parse(event.data);
    if(message.type==="status"&&typeof message.healthy==="boolean"&&wireState){
     store.setPollingEnabled(!message.healthy);notify(message.healthy?"live":"fallback");return;
    }
    if(!Number.isSafeInteger(message.revision)||message.revision<1)throw Error("Invalid revision");
    if(message.type==="snapshot"&&isScoreSnapshot(message.data)){
     wireState=message.data;revision=message.revision;
    }else if(message.type==="update"&&wireState&&message.previousRevision===revision&&message.revision===revision!+1){
     wireState=applyScoreDelta(wireState,message.data) as PublicScores;revision=message.revision;
    }else throw Error("Missing score revision");
    store.ingest(wireState!);store.setPollingEnabled(message.sourceHealthy===false);notify(message.sourceHealthy===false?"fallback":"live");
    failures=0;clearTimeout(retry);retry=undefined;
    if(!heartbeat)heartbeat=setTimeout(ping,25_000);
   }catch{failed();}
  };
  current.onerror=()=>{if(socket===current)failed();};
  current.onclose=()=>{if(socket===current)failed();};
 }
 const resume=()=>{
  if(!available()){disconnect();notify(navigator.onLine===false?"offline":"fallback");return;}
  store.setPollingEnabled(true);connect();
 };
 return {
  ...store,
  configure(endpoint:string){
   let next="";
   try{const candidate=new URL(endpoint);if(candidate.protocol==="wss:"||(candidate.protocol==="ws:"&&["localhost","127.0.0.1"].includes(candidate.hostname)))next=candidate.toString();}catch{}
   if(next===url)return;
   disconnect();url=next;failures=0;store.setPollingEnabled(true);notify("fallback");
   if(consumers)connect();
  },
  getDelivery:()=>delivery,
  getServerDelivery:():ScoreDelivery=>"fallback",
  subscribeDelivery(fn:()=>void){notices.add(fn);return ()=>{notices.delete(fn);};},
  subscribe(listener:()=>void){
   consumers++;
   const stop=store.subscribe(listener,FALLBACK_MS);
   if(consumers===1){document.addEventListener("visibilitychange",resume);window.addEventListener("online",resume);window.addEventListener("offline",resume);connect();}
   return ()=>{
    stop();consumers--;
    if(!consumers){disconnect();notify("fallback");store.setPollingEnabled(true);document.removeEventListener("visibilitychange",resume);window.removeEventListener("online",resume);window.removeEventListener("offline",resume);}
   };
  }
 };
}

export function scoreDeliveryLabel(mode:ScoreDelivery){
 return mode==="live"?"Live updates connected":mode==="connecting"?"Connecting to live updates…":mode==="offline"?"Offline — showing the last received scores":"Automatic refresh about every 30 seconds";
}
