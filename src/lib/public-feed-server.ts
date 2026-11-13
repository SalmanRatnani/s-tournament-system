import {unstable_cache} from "next/cache";
import {supabaseServer} from "./supabase";
import {calculateMBBLStandings} from "./mbbl/standings";
import type {PublicMBBLTie} from "./use-public-scoreboard";

/** Slow-changing data is cached separately from rally scores, never per spectator. */
export const readPublicEvent=unstable_cache(async()=>{
 const db=supabaseServer();
 const [courts,fixtures,teams,players]=await Promise.all([
  db.from("courts").select("id,youtube_video_id").order("id"),
  db.from("event_fixture_slots").select("id,tournament_id,stage,round_no,court_id,start_local,end_local,team_a_id,team_b_id,seed_a,seed_b,status").eq("published",true).limit(100),
  db.from("teams").select("id,name,tournament_id").limit(120),
  db.from("players").select("id,team_id,name,player_code,category,image_url,image_filename,is_captain,is_playing_captain").limit(500)
 ]);
 if([courts,fixtures,teams,players].some(result=>result.error))throw Error("Public event unavailable");
 return {courts:courts.data||[],fixtures:fixtures.data||[],teams:teams.data||[],players:players.data||[],generatedAt:new Date().toISOString()};
},["public-event-v2"],{revalidate:60,tags:["public-event"]});

/** One SQL statement gives scores and game rows from the same database snapshot. */
export async function readPublicScores(court:number|null=null){
 const {data,error}=await supabaseServer().rpc("mbbl_public_score_snapshot",{p_court:court});
 if(error||!data)throw Error("Score source unavailable");
 if(court!==null)return data;
 const event=await readPublicEvent();
 return {...data,standings:calculateMBBLStandings(event.teams,event.fixtures,data.mbblTies as PublicMBBLTie[])};
}
export const readCachedPublicScores=unstable_cache(()=>readPublicScores(),["public-scores-v3"],{revalidate:3,tags:["public-scores"]});
