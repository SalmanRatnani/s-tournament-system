import {NextRequest,NextResponse} from "next/server";
import {authorize} from "@/lib/auth";
export async function POST(req:NextRequest){
 try{
  const {matchId,status}=await req.json();
  if(typeof matchId!=="string"||!/^[\da-f-]{36}$/i.test(matchId)||!["scheduled","live","paused"].includes(status))return NextResponse.json({error:"Invalid status request"},{status:400});
  const auth=await authorize(req,undefined,true);if("error" in auth)return NextResponse.json({error:auth.error},{status:auth.status});
  const {data:target}=await auth.db.from("matches").select("kind").eq("id",matchId).single();
  if(!target||target.kind==="team_tie")return NextResponse.json({error:"Start individual rubbers, not team ties"},{status:409});
  const {data,error}=await auth.db.rpc("set_match_status",{p_match_id:matchId,p_status:status,p_actor:auth.user.id});
  if(error)return NextResponse.json({error:error.message},{status:409});
  return NextResponse.json({match:data});
 }catch{return NextResponse.json({error:"Request could not be processed"},{status:500});}
}
