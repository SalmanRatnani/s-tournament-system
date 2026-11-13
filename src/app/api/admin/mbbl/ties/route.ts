import {scheduleScorePublish} from "@/lib/score-publisher";
import {NextRequest,NextResponse} from "next/server";
import {staff,fail,isUuid} from "@/lib/authorized-admin";
import {allowedPair,validateNinePairs,validateTrumpSelections,type PairSelection} from "@/lib/mbbl/rules";
import {MBBL_CATEGORY_ORDER,type MBBLCategory} from "@/lib/mbbl/catalog";
export const runtime="nodejs";
const categories=new Set<string>(MBBL_CATEGORY_ORDER);
export async function POST(req:NextRequest){
 try{
  const guard=await staff(req,true);
  if("failure" in guard)return guard.failure;
  const body=await req.json();
  const {fixtureId,pairs,trumpA,trumpB}=body||{};
  if(!isUuid(fixtureId)||!Array.isArray(pairs)||!Array.isArray(trumpA)||!Array.isArray(trumpB))return fail("Invalid team tie preparation");
  const parsed:PairSelection[]=[];
  if(pairs.length!==9)return fail("Nine confirmed game pairs are required");
  for(const row of pairs){
   if(!row||!Number.isInteger(row.game)||!Array.isArray(row.a)||!Array.isArray(row.b)
    ||row.a.length!==2||row.b.length!==2||![...row.a,...row.b].every(c=>typeof c==="string"&&categories.has(c)))
    return fail("Each game must have two registered player categories on both sides");
   parsed.push({game:row.game,categories:row.a as [MBBLCategory,MBBLCategory]});
  }
  const aErrors=validateNinePairs(parsed);
  const bErrors=validateNinePairs(pairs.map(row=>({game:row.game,categories:row.b})));
  const tErrors=[...validateTrumpSelections("league",trumpA),...validateTrumpSelections("league",trumpB)];
  if(aErrors.length||bErrors.length||tErrors.length)return fail([...aErrors,...bErrors,...tErrors][0]);
  const {data,error}=await guard.auth.db.rpc("mbbl_prepare_league_tie",{
   p_fixture_id:fixtureId,p_pairs:pairs,p_trumps_a:trumpA,p_trumps_b:trumpB,p_actor:guard.auth.user.id
  });
  if(error)return fail(error.message,409);
  scheduleScorePublish();
  return NextResponse.json({tieId:data,status:"ready",message:"Lineups and Trump picks recorded. Assign a referee and start the game. Win by two after 14–14; no golden point."},{headers:{"Cache-Control":"no-store"}});
 }catch{return fail("Unable to prepare the MBBL tie",500);}
}
