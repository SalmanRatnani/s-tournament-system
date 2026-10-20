import {NextRequest,NextResponse} from "next/server";
import {staff,fail} from "@/lib/authorized-admin";
import {youtubeVideoId} from "@/lib/youtube";
export async function POST(req:NextRequest){
 try{
  const check=await staff(req,true);if("failure" in check)return check.failure;
  const body=await req.json();
  if(!Number.isInteger(body.court)||body.court<1||body.court>3)return fail("Invalid court");
  if(typeof body.url!=="string"||body.url.length>500)return fail("Invalid stream URL");
  const id=body.url.trim()?youtubeVideoId(body.url):null;
  if(body.url.trim()&&!id)return fail("Enter a valid public YouTube video link or ID");
  const {error}=await check.auth.db.from("courts").update({youtube_video_id:id}).eq("id",body.court);
  if(error)return fail(error.message,503);
  return NextResponse.json({ok:true,court:body.court,youtube_video_id:id});
 }catch{return fail("Unable to update court stream",500);}
}