import {NextRequest,NextResponse} from "next/server";
import {authorize} from "./auth";
export function fail(error:string,status=400){return NextResponse.json({error},{status});}
export async function staff(req:NextRequest,ownerOnly=false){
 const auth=await authorize(req,undefined,true);
 if("error" in auth)return {failure:fail(auth.error,auth.status)};
 if(ownerOnly&&auth.role!=="owner")return {failure:fail("Only the platform owner may perform this action",403)};
 return {auth};
}
export function isUuid(x:unknown):x is string{return typeof x==="string"&&/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(x);}
