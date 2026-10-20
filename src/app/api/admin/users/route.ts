import {NextRequest,NextResponse} from "next/server";import {fail,staff,isUuid} from "@/lib/authorized-admin";
export async function POST(req:NextRequest){try{
 const check=await staff(req);if("failure" in check)return check.failure;
 const {userId,role}=await req.json();if(!isUuid(userId)||!["viewer","referee","admin"].includes(role))return fail("Invalid user or role");
 const {db,user}=check.auth;
 const {data:target,error:targetErr}=await db.from("profiles").select("role").eq("id",userId).single();if(targetErr||!target)return fail("User not found",404);
 if(userId===user.id||target.role==="owner")return fail("Owner and self roles cannot be changed",403);
 if((role==="admin"||target.role==="admin")&&check.auth.role!=="owner")return fail("Only the owner may manage admins",403);
 const {error}=await db.from("profiles").update({role}).eq("id",userId).neq("role","owner");if(error)return fail(error.message);
 return NextResponse.json({ok:true});
 }catch{return fail("Unable to update account",500);}}
