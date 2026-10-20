import { NextRequest,NextResponse } from "next/server";
import {authorize} from "@/lib/auth";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
  const body=await req.json();const {matchId,side,action,requestId}=body;
  if(typeof matchId!=="string"||!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(matchId)||!(["a","b"].includes(side))||!["point","undo"].includes(action)||typeof requestId!=="string"||!/^[\da-f-]{36}$/i.test(requestId))return NextResponse.json({error:"Invalid scoring request"},{status:400});
  const auth=await authorize(req,matchId);
  if("error" in auth)return NextResponse.json({error:auth.error},{status:auth.status});
  const {data:target,error:targetError}=await auth.db.from("matches").select("kind").eq("id",matchId).single();
  if(targetError||!target||target.kind==="team_tie")return NextResponse.json({error:"Score individual rubbers, not team ties"},{status:409});
  const {data,error}=await auth.db.rpc("apply_score_action",{p_match_id:matchId,p_side:side,p_action:action,p_request_id:requestId,p_actor:auth.user.id});
  if(error){const conflict=/not live|nothing to undo|already completed/i.test(error.message);return NextResponse.json({error:error.message},{status:conflict?409:400});}
  return NextResponse.json({match:data});
 }catch{return NextResponse.json({error:"Request could not be processed"},{status:500});}
}
