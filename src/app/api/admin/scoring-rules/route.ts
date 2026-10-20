import {NextRequest,NextResponse} from "next/server";
import {staff,fail,isUuid} from "@/lib/authorized-admin";
import {validateGameRules} from "@/lib/scoring-rules";
export async function POST(req:NextRequest){
 try{const guard=await staff(req);if("failure" in guard)return guard.failure;
  const body=await req.json();if(!isUuid(body.tournamentId))return fail("Invalid tournament ID");
  const rules=validateGameRules(body.rules);
  const {data,error}=await guard.auth.db.rpc("set_tournament_game_rules",{
   p_tournament_id:body.tournamentId,p_best_of:rules.best_of,p_winning_score:rules.winning_score,
   p_win_by_two:rules.win_by_two,p_point_cap:rules.point_cap
  });
  if(error)return fail(error.message,409);
  return NextResponse.json({rules:data});
 }catch(e){return fail(e instanceof Error?e.message:"Unable to save scoring rules",400);}
}
