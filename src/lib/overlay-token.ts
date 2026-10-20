import {createHmac,timingSafeEqual} from "node:crypto";
const ttlSeconds=24*60*60;
function key(){const secret=process.env.OBS_OVERLAY_SIGNING_SECRET;if(!secret||secret.length<24)throw Error("Server authentication key not configured");return secret;}
export function issueOverlayToken(court:number,now=Math.floor(Date.now()/1000)){
 if(![1,2,3].includes(court))throw Error("Invalid court");
 const expires=now+ttlSeconds;
 const data=court+"."+expires;
 const sig=createHmac("sha256",key()).update("obs-overlay-v1:"+data).digest("base64url");
 return data+"."+sig;
}
export function verifyOverlayToken(court:number,token:string,now=Math.floor(Date.now()/1000)){
 if(![1,2,3].includes(court)||token.length>200)return false;
 const parts=token.split(".");
 if(parts.length!==3||parts[0]!==String(court)||!/^[0-9]{10}$/.test(parts[1])||!/^[A-Za-z0-9_-]{43}$/.test(parts[2]))return false;
 const exp=Number(parts[1]);if(!Number.isSafeInteger(exp)||exp<=now||exp>now+ttlSeconds)return false;
 try{
  const expected=createHmac("sha256",key()).update("obs-overlay-v1:"+parts[0]+"."+parts[1]).digest();
  const supplied=Buffer.from(parts[2],"base64url");
  return expected.length===supplied.length&&timingSafeEqual(expected,supplied);
 }catch{return false;}
}
