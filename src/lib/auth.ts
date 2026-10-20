import { supabaseServer } from "./supabase";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
export type AuthSuccess = { db: SupabaseClient; user: User; isAdmin: boolean; role: string };
export type AuthFailure = { error: string; status: number };
export type AuthResult = AuthSuccess | AuthFailure;
export async function authorize(req:NextRequest,matchId?:string,adminOnly=false): Promise<AuthResult> {
 const bearer=req.headers.get("authorization")||"";
 if(!bearer.startsWith("Bearer "))return {error:"Sign in required",status:401} as const;
 const db=supabaseServer();
 const {data:{user},error}=await db.auth.getUser(bearer.slice(7));
 if(error||!user)return {error:"Invalid or expired session",status:401} as const;
 if(!user.email_confirmed_at)return {error:"Verify your email address before accessing staff tools",status:403} as const;
 const profile=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
 if(profile.error)return {error:"Access lookup failed",status:503} as const;
 const role=profile.data?.role||"viewer";
 const isAdmin=role==="owner";
 if(!isAdmin&&adminOnly)return {error:"Organizer access required",status:403} as const;
 if(!isAdmin&&matchId){if(role!=="referee")return {error:"Referee role required",status:403} as const;
 const assignment=await db.from("referee_assignments").select("match_id").eq("match_id",matchId).eq("user_id",user.id).maybeSingle();
 if(assignment.error)return {error:"Assignment lookup failed",status:503} as const;
 if(!assignment.data)return {error:"You are not assigned to this match",status:403} as const;}
 return {db,user,isAdmin,role} as const;
}
