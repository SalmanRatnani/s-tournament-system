import {after} from "next/server";
import {revalidateTag} from "next/cache";
import {readPublicScores} from "./public-feed-server";

function relayBase(){
 try{
  const url=new URL(process.env.PUBLIC_SCORE_RELAY_URL||"");
  if(url.protocol!=="https:"&&(process.env.NODE_ENV==="production"||!["localhost","127.0.0.1"].includes(url.hostname)))return null;
  if(url.username||url.password||url.search||url.hash)return null;
  return url;
 }catch{return null;}
}
export function publicScoreSocketUrl(){
 const base=relayBase();if(!base)return "";
 const url=new URL("/scores",base);url.protocol=base.protocol==="https:"?"wss:":"ws:";return url.toString();
}

/** Call only AFTER a successful committed mutation. Publishing failure must
 * never turn a confirmed referee point into an apparent failed score command.
 */
export function scheduleScorePublish(){
 try{
 revalidateTag("public-scores");
 const base=relayBase(),secret=process.env.SCORE_RELAY_PUBLISH_SECRET;
 if(!base||!secret||secret.length<32)return;
 after(async()=>{
  try{
   const body=JSON.stringify(await readPublicScores());
   for(let attempt=0;attempt<2;attempt++){
    try{
     const result=await fetch(new URL("/publish",base),{method:"POST",headers:{"Authorization":`Bearer ${secret}`,"Content-Type":"application/json"},body,signal:AbortSignal.timeout(2000),redirect:"error",cache:"no-store"});
     if(result.ok)return;
    }catch{}
   }
   console.warn("Public score relay unavailable; scheduled reconciliation will retry.");
  }catch{console.warn("Public score publishing could not read the confirmed snapshot.");}
 });
 }catch{console.warn("Public score publishing could not be scheduled; scoring remains confirmed.");}
}
