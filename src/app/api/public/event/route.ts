import {NextResponse} from "next/server";
import {readPublicEvent} from "@/lib/public-feed-server";
import {publicScoreSocketUrl} from "@/lib/score-publisher";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET(){
 try{return NextResponse.json({...await readPublicEvent(),websocketUrl:publicScoreSocketUrl()},{headers:{
  "Cache-Control":"public, max-age=15, s-maxage=60, stale-while-revalidate=30",
  "Vercel-CDN-Cache-Control":"public, s-maxage=60, stale-while-revalidate=30",
  "X-Content-Type-Options":"nosniff"
 }});}catch{return NextResponse.json({error:"Event information temporarily unavailable"},{status:503,headers:{"Cache-Control":"no-store","Retry-After":"15"}});}
}
