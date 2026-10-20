import {NextRequest,NextResponse} from "next/server";
import {staff,fail,isUuid} from "@/lib/authorized-admin";
import {validateAuctionHandoff} from "@/lib/auction-handoff";
export async function POST(req:NextRequest){
 try{const guard=await staff(req);if("failure" in guard)return guard.failure;
  if(Number(req.headers.get("content-length")||0)>2_000_000)return fail("Import file exceeds 2 MB",413);
  const raw=await req.text();if(raw.length>2_000_000)return fail("Import file exceeds 2 MB",413);
  const body=JSON.parse(raw);if(!isUuid(body.tournamentId))return fail("Invalid tournament ID");
  const document=validateAuctionHandoff(body.document,true);
  const {data,error}=await guard.auth.db.rpc("import_auction_roster",{p_tournament_id:body.tournamentId,p_document:document});
  if(error)return fail(error.message,409);return NextResponse.json({result:data});
 }catch(e){return fail(e instanceof Error?e.message:"Import failed",400);}
}
