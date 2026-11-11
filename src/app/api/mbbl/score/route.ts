import {NextRequest,NextResponse} from "next/server";
import {authorize} from "@/lib/auth";
export const runtime="nodejs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req:NextRequest){
 try{
  const body=await req.json();
  const {tieId,game,side,action,requestId,expectedVersion}=body||{};
  if(typeof tieId!=="string"||!uuid.test(tieId)||typeof requestId!=="string"||!uuid.test(requestId)
   ||!Number.isInteger(game)||game<1||game>9||!["a","b"].includes(side)
   ||!["point","undo"].includes(action)||!Number.isSafeInteger(expectedVersion)||expectedVersion<0)
   return NextResponse.json({error:"Invalid scoring request"},{status:400});
  const auth=await authorize(req);
  if("error" in auth)return NextResponse.json({error:auth.error},{status:auth.status});
  if(!["referee","owner"].includes(auth.role))return NextResponse.json({error:"Match official role required"},{status:403});
  const {db,user,role}=auth;
  if(role!=="owner"){
   const {data,error}=await db.from("mbbl_referee_assignments").select("tie_id").eq("tie_id",tieId).eq("user_id",user.id).maybeSingle();
   if(error)return NextResponse.json({error:"Assignment lookup failed"},{status:503});
   if(!data)return NextResponse.json({error:"You are not assigned to this team tie"},{status:403});
  }
  const {data,error}=await db.rpc("mbbl_apply_score_action",{
   p_tie_id:tieId,p_game:game,p_side:side,p_action:action,p_request_id:requestId,p_actor:user.id,p_expected_version:expectedVersion
  });
  if(error){
   const conflict=/stale|not live|nothing to undo|blocked|pending|rule|completed|replayed/i.test(error.message);
   return NextResponse.json({error:error.message},{status:conflict?409:400,headers:{"Cache-Control":"no-store"}});
  }
  return NextResponse.json({result:data},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Unable to record score"},{status:500});}
}
