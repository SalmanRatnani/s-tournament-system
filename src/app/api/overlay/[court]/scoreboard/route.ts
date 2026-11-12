import {NextRequest,NextResponse} from "next/server";
import {verifyOverlayToken} from "@/lib/overlay-token";
import {readPublicScores} from "@/lib/public-feed-server";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
export async function GET(req:NextRequest,{params}:{params:Promise<{court:string}>}){
 const court=Number((await params).court);
 const bearer=req.headers.get("authorization")||"";
 if(!bearer.startsWith("Bearer ")||!verifyOverlayToken(court,bearer.slice(7)))
  return NextResponse.json({error:"Overlay link expired or invalid"},{status:401,headers});
 try{return NextResponse.json(await readPublicScores(court),{headers});}
 catch{return NextResponse.json({error:"Overlay scores temporarily unavailable"},{status:503,headers:{...headers,"Retry-After":"3"}});}
}
