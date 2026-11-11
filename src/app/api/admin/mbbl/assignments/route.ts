import {NextRequest,NextResponse} from "next/server";
import {staff,fail,isUuid} from "@/lib/authorized-admin";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const access=await staff(req,true);
 if("failure" in access)return access.failure;
 const db=access.auth.db;
 const [ties,profiles,assignments,teams]=await Promise.all([
  db.from("mbbl_ties").select("id,court_id,team_a_id,team_b_id,status,active_game").order("court_id").limit(100),
  db.from("profiles").select("id,display_name,role").eq("role","referee").limit(50),
  db.from("mbbl_referee_assignments").select("tie_id,user_id").limit(150),
  db.from("teams").select("id,name").limit(120)
 ]);
 if(ties.error||profiles.error||assignments.error||teams.error)return fail("Unable to load MBBL referee assignments",503);
 return NextResponse.json({ties:ties.data||[],referees:profiles.data||[],assignments:assignments.data||[],teams:teams.data||[]},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:NextRequest){
 const access=await staff(req,true);
 if("failure" in access)return access.failure;
 try{
  const body=await req.json();
  const {tieId,userId,remove}=body||{};
  if(!isUuid(tieId)||!isUuid(userId)||typeof remove!=="boolean")return fail("Invalid assignment details");
  const db=access.auth.db;
  const [t,p]=await Promise.all([
   db.from("mbbl_ties").select("id,status").eq("id",tieId).maybeSingle(),
   db.from("profiles").select("id,role").eq("id",userId).maybeSingle()
  ]);
  if(t.error||p.error||!t.data||p.data?.role!=="referee")return fail("Only an existing referee can be assigned to a valid MBBL tie",403);
  if(t.data.status==="completed")return fail("Completed ties cannot be reassigned",409);
  const op=remove?
   await db.from("mbbl_referee_assignments").delete().eq("tie_id",tieId).eq("user_id",userId):
   await db.from("mbbl_referee_assignments").upsert({tie_id:tieId,user_id:userId});
  if(op.error)return fail("Unable to update assignment",409);
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch{return fail("Unable to save assignment",500);}
}
