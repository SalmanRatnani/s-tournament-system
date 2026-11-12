export type SnapshotState<T> = {data:T;loading:boolean;error:string;receivedAt:number};
type Options<T> = {url:string;initial:T;headers?:HeadersInit;timeoutMs?:number;accept?:(next:T,previous:T)=>boolean};

/** One request/timer per resource per tab, shared by every mounted consumer. */
export function createSnapshotStore<T>({url,initial,headers,timeoutMs=8000,accept}:Options<T>){
 const initialState:SnapshotState<T>={data:initial,loading:true,error:"",receivedAt:0};
 let state=initialState;
 const listeners=new Map<()=>void,number>();
 let timer:ReturnType<typeof setTimeout>|undefined;
 let flight:Promise<void>|undefined;
 let controller:AbortController|undefined;
 let failures=0,attempted=false;
 const emit=()=>listeners.forEach((_,listener)=>listener());
 const available=()=>typeof document!=="undefined"&&document.visibilityState!=="hidden"&&navigator.onLine!==false;
 const clear=()=>{if(timer)clearTimeout(timer);timer=undefined;};
 const schedule=()=>{
  clear();
  if(!listeners.size||!available())return;
  const intervals=[...listeners.values()].filter(n=>n>0);
  // A public, load-once view does not keep retrying throughout a broadcast.
  if(!intervals.length)return;
  const normal=Math.max(1000,Math.min(...intervals));
  const delay=failures?Math.min(60000,normal*2**Math.min(failures,6)):normal;
  timer=setTimeout(()=>void refresh(),delay+Math.floor(Math.random()*Math.min(1000,delay*.15)));
 };
 async function refresh(){
  if(flight)return flight;
  clear();
  if(!available())return;
  attempted=true;
  const request=new AbortController();controller=request;
  flight=(async()=>{
   const timeout=setTimeout(()=>request.abort(),timeoutMs);
   try{
    const response=await fetch(url,{headers,signal:request.signal,credentials:"omit"});
    if(!response.ok)throw new Error("Feed unavailable");
    const next=await response.json() as T;
    if(!accept||accept(next,state.data))state={data:next,loading:false,error:"",receivedAt:Date.now()};
    else state={...state,loading:false,error:""};
    failures=0;
   }catch{
    if(listeners.size){failures++;state={...state,loading:false,error:"Updates unavailable. Showing the last received information."};}
   }finally{clearTimeout(timeout);controller=undefined;flight=undefined;emit();schedule();}
  })();
  return flight;
 }
 const resume=()=>{
  clear();
  if(!available()){controller?.abort();return;}
  if(!state.receivedAt||[...listeners.values()].some(n=>n>0))void refresh();
 };
 return {
  getSnapshot:()=>state,
  getServerSnapshot:()=>initialState,
  refresh,
  subscribe(listener:()=>void,interval=0){
   listeners.set(listener,interval);
   if(listeners.size===1){
    document.addEventListener("visibilitychange",resume);
    window.addEventListener("online",resume);
    window.addEventListener("offline",resume);
   }
   if(!attempted||Date.now()-state.receivedAt>30000)void refresh();else schedule();
   return ()=>{
    listeners.delete(listener);
    if(!listeners.size){clear();document.removeEventListener("visibilitychange",resume);window.removeEventListener("online",resume);window.removeEventListener("offline",resume);}
    else schedule();
   };
  }
 };
}
