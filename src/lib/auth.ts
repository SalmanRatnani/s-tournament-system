import { supabaseServer } from "./supabase";
import type { NextRequest } from "next/server";
export async function authorize(req:NextRequest,matchId?:string,adminOnly=false){
 const bearer=req.headers.get("authorization")||"";
 if(!bearer.startsWith("Bearer "))return {error:"Sign in required",status:401} as const;
 const db=supabaseServer();
 const {data:{user},error}=await db.auth.getUser(bearer.slice(7));
 if(error||!user)return {error:"Invalid or expired session",status:401} as const;
 const profile=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
 if(profile.error)return {error:"Access lookup failed",status:503} as const;
 const role=profile.data?.role||"viewer";
 const isAdmin=role==="admin"||role==="owner";
 if(!isAdmin&&adminOnly)return {error:"Organizer access required",status:403} as const;
 if(!isAdmin&&matchId){const assignment=await db.from("referee_assignments").select("match_id").eq("match_id",matchId).eq("user_id",user.id).maybeSingle();
 if(assignment.error)return {error:"Assignment lookup failed",status:503} as const;
 if(!assignment.data)return {error:"You are not assigned to this match",status:403} as const;}
 return {db,user,isAdmin,role} as const;
}
