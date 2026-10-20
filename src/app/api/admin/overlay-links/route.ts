import {NextRequest,NextResponse} from "next/server";
import {staff,fail} from "@/lib/authorized-admin";
import {issueOverlayToken} from "@/lib/overlay-token";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
  const guard=await staff(req,true);if("failure" in guard)return guard.failure;
  const data=await req.json();
  if(!Number.isInteger(data.court)||data.court<1||data.court>3)return fail("Court must be 1, 2 or 3");
  const token=issueOverlayToken(data.court);
  return NextResponse.json({path:"/overlay/"+data.court+"?token="+encodeURIComponent(token),expires_in_hours:24},{headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
 }catch{return fail("Unable to generate overlay link",503);}
}
