import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabase";

/**
 * Read-only public projection. All visitors share one CDN cache key.
 * No service-role credentials, referee info, hidden Trump selections or
 * unpublished fixtures are ever returned.
 */
export const dynamic="force-dynamic";
export const runtime="nodejs";
const headers={
 "Cache-Control":"public, s-maxage=3, stale-while-revalidate=9",
 "Vercel-CDN-Cache-Control":"public, s-maxage=3, stale-while-revalidate=9",
 "CDN-Cache-Control":"public, s-maxage=3, stale-while-revalidate=9",
 "X-Content-Type-Options":"nosniff"
};
export async function GET(){
 try{
  const db=supabaseServer();
  const [match,courts,fixtures,teams]=await Promise.all([
   db.from("matches").select("id,court_id,tournament_id,round,kind,side_a,side_b,status,score_a,score_b,games,current_game,best_of,winning_score,win_by_two,point_cap,winner,version,updated_at,team_a_id,team_b_id").order("updated_at",{ascending:false}).limit(300),
   db.from("courts").select("id,youtube_video_id").order("id"),
   db.from("event_fixture_slots").select("id,tournament_id,stage,round_no,court_id,start_local,end_local,team_a_id,team_b_id,seed_a,seed_b,status").eq("published",true).limit(100),
   db.from("teams").select("id,name,tournament_id").limit(120)
  ]);
  const {data:players,error:playersError}=await db.from("players").select("id,team_id,name,player_code,category,image_url,image_filename,auction_amount,is_captain,is_playing_captain").limit(500);
  const error=match.error||courts.error||fixtures.error||teams.error||playersError;
  if(error)throw Error("Public score source unavailable");
  // Do not expose a game until the owner has explicitly activated the tie.
  const fixtureIds=(fixtures.data||[]).map(f=>f.id);
  const mbbl=fixtureIds.length?await db.from("mbbl_ties")
   .select("id,fixture_slot_id,tournament_id,court_id,team_a_id,team_b_id,status,active_game,score_a,score_b,overall_a,overall_b,version,updated_at")
   .in("fixture_slot_id",fixtureIds).in("status",["live","paused","awaiting_relay","completed"]).limit(100):{data:[],error:null};
  if(mbbl.error)throw Error("MBBL score feed temporarily unavailable");
  const tieIds=(mbbl.data||[]).map(t=>t.id);
  const games=tieIds.length?await db.from("mbbl_tie_games")
   .select("tie_id,game_number,score_a,score_b,status,category_a,category_b,trump_a,trump_b")
   .in("tie_id",tieIds).limit(900):{data:[],error:null};
  if(games.error)throw Error("MBBL game feed temporarily unavailable");
  return NextResponse.json({
   matches:match.data||[],courts:courts.data||[],
   fixtures:fixtures.data||[],teams:teams.data||[],players:players||[],
   mbblTies:(mbbl.data||[]).map(t=>({...t,games:(games.data||[]).filter(g=>g.tie_id===t.id)
    // Trump decisions remain private until the corresponding game starts.
     .map(g=>g.status==="pending"?{...g,trump_a:null,trump_b:null}:g)}))
  },{headers});
 }catch{
  return NextResponse.json({error:"Public scores are temporarily unavailable"},{
   status:503,headers:{"Cache-Control":"no-store","Retry-After":"3"}
  });
 }
}
