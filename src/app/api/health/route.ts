import {NextResponse} from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
/** Liveness probe only. Never expose secrets, connected database details, or user data. */
export function GET(){
 return NextResponse.json({status:"ok",service:"s-tournament"},{
  headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}
 });
}
