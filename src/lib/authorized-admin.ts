import {NextRequest,NextResponse} from "next/server";
import {authorize} from "./auth";
import type {AuthSuccess} from "./auth";
export function fail(error:string,status=400){return NextResponse.json({error},{status});}
export type StaffResult = {failure:NextResponse;auth?:never}|{auth:AuthSuccess;failure?:never};
export async function staff(req:NextRequest,ownerOnly=false):Promise<StaffResult>{
 const auth=await authorize(req,undefined,true);
 if("error" in auth)return {failure:fail(auth.error ?? "Authorization failed",auth.status ?? 403)};
 if(ownerOnly&&auth.role!=="owner")return {failure:fail("Only the platform owner may perform this action",403)};
 return {auth};
}
export function isUuid(x:unknown):x is string{return typeof x==="string"&&/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(x);}
