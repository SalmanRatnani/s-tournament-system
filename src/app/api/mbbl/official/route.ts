import {NextRequest,NextResponse} from "next/server";
import {authorize} from "@/lib/auth";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 try{
  const auth=await authorize(req);
  if("error" in auth)return NextResponse.json({error:auth.error},{status:auth.status});
  if(!["owner","referee"].includes(auth.role))return NextResponse.json({error:"Match official role required"},{status:403});
  const {db,user,role}=auth;
  let query=db.from("mbbl_ties").select("id,fixture_slot_id,tournament_id,court_id,status,active_game,score_a,score_b,overall_a,overall_b,version,team_a_id,team_b_id,updated_at").order("court_id").limit(40);
  if(role==="referee"){
   const a=await db.from("mbbl_referee_assignments").select("tie_id").eq("user_id",user.id);
   if(a.error)throw Error("Assignment lookup failed");
   const ids=(a.data||[]).map(x=>x.tie_id);
   if(!ids.length)return NextResponse.json({ties:[],games:[],teams:[]},{headers:{"Cache-Control":"no-store"}});
   query=query.in("id",ids);
  }
  const ties=await query;
  if(ties.error)throw Error("Official match lookup failed");
  const ids=(ties.data||[]).map(t=>t.id);
  const [games,teams]=await Promise.all([
   ids.length?db.from("mbbl_tie_games").select("tie_id,game_number,category_a,category_b,score_a,score_b,status,winner").in("tie_id",ids).order("game_number") : Promise.resolve({data:[],error:null}),
   db.from("teams").select("id,name").limit(120)
  ]);
  if(games.error||teams.error)throw Error("Official scoring data unavailable");
  return NextResponse.json({ties:ties.data||[],games:games.data||[],teams:teams.data||[]},{
   headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}
  });
 }catch{
  return NextResponse.json({error:"Official score feed unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}
