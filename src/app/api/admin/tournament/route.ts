import {NextRequest,NextResponse} from "next/server";import {staff,fail,isUuid} from "@/lib/authorized-admin";
export async function POST(req:NextRequest){try{const check=await staff(req);if("failure" in check)return check.failure;
 const {action,tournamentId,name}=await req.json();const db=check.auth.db;
 if(action==="initialize"){
  if(typeof name!=="string"||!name.trim()||name.length>120)return fail("Tournament name required");
  const {data:existing}=await db.from("tournaments").select("id").limit(1);if(existing?.length)return fail("A tournament already exists; use it instead",409);
  const {data,error}=await db.from("tournaments").insert({name:name.trim(),type:"team",status:"upcoming"}).select("*").single();if(error)return fail(error.message);
  const {error:ruleError}=await db.from("tournament_rules").insert({tournament_id:data.id});if(ruleError)return fail(ruleError.message);
  return NextResponse.json({tournament:data});
 }
 if(!isUuid(tournamentId))return fail("Invalid tournament");
 const funcs:{[key:string]:string}={league:"generate_six_team_league",semis:"generate_team_semifinals",final:"generate_team_final"};if(!funcs[action])return fail("Invalid tournament operation");
 const {data,error}=await db.rpc(funcs[action],{p_tournament_id:tournamentId});if(error)return fail(error.message,409);
 return NextResponse.json({created:data});
 }catch{return fail("Tournament operation failed",500);}}
