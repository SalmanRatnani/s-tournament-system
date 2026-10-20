import {NextRequest,NextResponse} from "next/server";import {staff,fail,isUuid} from "@/lib/authorized-admin";
export async function POST(req:NextRequest){try{const check=await staff(req);if("failure" in check)return check.failure;
 const {tieId,court,kind,sideA,sideB}=await req.json();
 if(!isUuid(tieId)||![1,2,3].includes(court)||!["singles","doubles"].includes(kind)||!Array.isArray(sideA)||!Array.isArray(sideB))return fail("Invalid rubber details");
 const required=kind==="singles"?1:2;
 if(sideA.length!==required||sideB.length!==required||![...sideA,...sideB].every(n=>typeof n==="string"&&n.length>0&&n.length<=90))return fail("Select the correct number of players from each team");
 if(new Set(sideA).size!==required||new Set(sideB).size!==required)return fail("Duplicate player selection");
 const db=check.auth.db;
 const {data:tie,error:tieErr}=await db.from("matches").select("*").eq("id",tieId).single();if(tieErr||!tie||tie.kind!=="team_tie"||tie.status==="completed")return fail("Team tie unavailable",409);
 const [{data:teamA},{data:teamB},{count}]=await Promise.all([db.from("players").select("name").eq("team_id",tie.team_a_id),db.from("players").select("name").eq("team_id",tie.team_b_id),db.from("matches").select("id",{head:true,count:"exact"}).eq("tie_id",tieId)]);
 if((count||0)>=5)return fail("Team tie already has five rubbers",409);
 if(!sideA.every((n:string)=>teamA?.some(p=>p.name===n))||!sideB.every((n:string)=>teamB?.some(p=>p.name===n)))return fail("Players must belong to their respective team rosters",403);
 const {data:rules,error:rulesErr}=await db.from("tournament_rules").select("default_best_of,default_winning_score,default_win_by_two,default_point_cap").eq("tournament_id",tie.tournament_id).single();
 if(rulesErr||!rules)return fail("Tournament scoring rules are not configured",409);
 const {data,error}=await db.from("matches").insert({tournament_id:tie.tournament_id,court_id:court,round:tie.round+" • RUBBER "+((count||0)+1),kind,tie_id:tieId,side_a:sideA.join(" / "),side_b:sideB.join(" / "),best_of:rules.default_best_of,winning_score:rules.default_winning_score,point_cap:rules.default_point_cap,win_by_two:rules.default_win_by_two}).select("*").single();
 if(error)return fail(error.message,409);return NextResponse.json({match:data});
 }catch{return fail("Unable to create rubber",500);}}
