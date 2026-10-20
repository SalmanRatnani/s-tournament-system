import {NextRequest,NextResponse} from "next/server";import {staff,fail,isUuid} from "@/lib/authorized-admin";
export async function POST(req:NextRequest){try{const check=await staff(req);if("failure" in check)return check.failure;
 const {matchId,userId,remove}=await req.json();if(!isUuid(matchId)||!isUuid(userId)||typeof remove!=="boolean")return fail("Invalid assignment request");
 const db=check.auth.db;const [profile,match]=await Promise.all([db.from("profiles").select("role").eq("id",userId).single(),db.from("matches").select("kind,status").eq("id",matchId).single()]);
 if(profile.data?.role!=="referee")return fail("Selected account must have referee role");
 if(!match.data||match.data.kind==="team_tie")return fail("Assign referees to individual rubbers, not a team tie");
 if(match.data.status==="completed")return fail("Cannot reassign completed matches",409);
 const {error}=remove?await db.from("referee_assignments").delete().eq("match_id",matchId).eq("user_id",userId):await db.from("referee_assignments").upsert({match_id:matchId,user_id:userId});
 if(error)return fail(error.message);return NextResponse.json({ok:true});
 }catch{return fail("Could not update referee assignment",500);}}
