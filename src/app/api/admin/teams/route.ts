import {NextRequest,NextResponse} from "next/server";import {staff,fail,isUuid} from "@/lib/authorized-admin";
export async function POST(req:NextRequest){try{const check=await staff(req);if("failure" in check)return check.failure;
 const {name,tournamentId}=await req.json();if(typeof name!=="string"||!name.trim()||name.length>80||!isUuid(tournamentId))return fail("Invalid team name or tournament");
 const db=check.auth.db;const {data:rule}=await db.from("tournament_rules").select("stage").eq("tournament_id",tournamentId).maybeSingle();if(rule?.stage&&rule.stage!=="registration")return fail("Teams cannot change after the league starts",409);
 const {data,error}=await db.from("teams").insert({name:name.trim(),tournament_id:tournamentId}).select("*").single();if(error)return fail(error.message,409);
 return NextResponse.json({team:data});}catch{return fail("Unable to create team",500);}}
