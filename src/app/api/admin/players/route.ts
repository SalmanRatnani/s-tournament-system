import {NextRequest,NextResponse} from "next/server";import {staff,fail,isUuid} from "@/lib/authorized-admin";
export async function POST(req:NextRequest){try{const check=await staff(req);if("failure" in check)return check.failure;
 const {names,teamId}=await req.json();if(!isUuid(teamId)||!Array.isArray(names)||names.length<1||names.length>18||names.some((n:unknown)=>typeof n!=="string"||!n.trim()||n.length>90))return fail("Provide 1–18 valid player names");
 const db=check.auth.db;const {data:team}=await db.from("teams").select("tournament_id").eq("id",teamId).single();if(!team)return fail("Team not found",404);
 const {data:rule}=await db.from("tournament_rules").select("stage").eq("tournament_id",team.tournament_id).maybeSingle();if(rule?.stage&&rule.stage!=="registration")return fail("Rosters are locked after the league starts",409);
 const unique=[...new Set((names as string[]).map(n=>n.trim()))];if(unique.length!==names.length)return fail("Repeated names in player list",400);
 // Insert within a single request. SQL roster-cap trigger prevents exceeding 18.
 const {data,error}=await db.from("players").insert(unique.map(name=>({team_id:teamId,name}))).select("id,name,team_id");if(error)return fail(error.message,409);
 return NextResponse.json({players:data});}catch{return fail("Unable to register players",500);}}
