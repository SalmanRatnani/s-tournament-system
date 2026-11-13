import {scheduleScorePublish} from "@/lib/score-publisher";
import {NextRequest,NextResponse} from "next/server";
import {staff,fail,isUuid} from "@/lib/authorized-admin";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const guard=await staff(req,true);
 if("failure" in guard)return guard.failure;
 try{
  const body=await req.json();
  if(!isUuid(body?.tieId)||!["start","pause","finish"].includes(body?.action)
   ||!Number.isSafeInteger(body?.expectedVersion)||body.expectedVersion<0)
   return fail("Invalid MBBL game control request");
  const {data,error}=await guard.auth.db.rpc("mbbl_control_game",{
   p_tie_id:body.tieId,p_actor:guard.auth.user.id,p_action:body.action,p_expected_version:body.expectedVersion
  });
  if(error)return fail(error.message,409);
  scheduleScorePublish();
  return NextResponse.json({tie:data},{headers:{"Cache-Control":"no-store"}});
 }catch{return fail("Unable to control official game",500);}
}
