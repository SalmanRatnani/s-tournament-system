import {NextResponse} from "next/server";
import {readCachedPublicScores} from "@/lib/public-feed-server";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET(){
 try{return NextResponse.json(await readCachedPublicScores(),{headers:{
  "Cache-Control":"public, max-age=0, s-maxage=3, stale-while-revalidate=3",
  "Vercel-CDN-Cache-Control":"public, s-maxage=3, stale-while-revalidate=3",
  "CDN-Cache-Control":"public, s-maxage=3, stale-while-revalidate=3",
  "X-Content-Type-Options":"nosniff"
 }});}catch{return NextResponse.json({error:"Public scores are temporarily unavailable"},{status:503,headers:{"Cache-Control":"no-store","Retry-After":"10"}});}
}
