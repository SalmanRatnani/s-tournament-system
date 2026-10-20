import {NextRequest,NextResponse} from "next/server";
import {staff} from "@/lib/authorized-admin";
export async function GET(req:NextRequest){try{
 const check=await staff(req);if("failure" in check)return check.failure;
 const {db}=check.auth;
 const [tournaments,teams,players,matches,profiles,assignments,rules]=await Promise.all([
  db.from("tournaments").select("*").order("created_at"),
  db.from("teams").select("*").order("created_at"),
  db.from("players").select("*").order("created_at"),
  db.from("matches").select("*").order("round"),
  db.from("profiles").select("id,role,display_name,created_at").order("created_at"),
  db.from("referee_assignments").select("match_id,user_id"),
  db.from("tournament_rules").select("*")
 ]);
 const queries=[tournaments,teams,players,matches,profiles,assignments,rules];const err=queries.find(r=>r.error)?.error;
 if(err)return NextResponse.json({error:err.message},{status:503});
 const users=await db.auth.admin.listUsers({perPage:1000});
 if(users.error)return NextResponse.json({error:users.error.message},{status:503});
 return NextResponse.json({tournaments:tournaments.data,teams:teams.data,players:players.data,matches:matches.data,profiles:profiles.data?.map(p=>({...p,email:users.data.users.find(u=>u.id===p.id)?.email||""})),assignments:assignments.data,rules:rules.data,role:check.auth.role,userId:check.auth.user.id});
 }catch{return NextResponse.json({error:"Unable to load organizer data"},{status:503});}}
