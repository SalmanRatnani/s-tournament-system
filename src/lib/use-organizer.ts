"use client";
import {useEffect,useState,useCallback} from "react";
import {supabaseBrowser} from "./supabase";
import type {Match} from "./types";
export type RosterPlayer={id:string;name:string;team_id:string;image_url?:string|null;image_filename?:string|null;player_code?:string|null;category?:string|null;auction_amount?:number|null;is_captain?:boolean;is_playing_captain?:boolean};
export type Profile={id:string;email:string;display_name:string;role:"owner"|"admin"|"referee"|"viewer"};
export type OrganizerData={rules:{tournament_id:string;default_best_of:number;default_winning_score:number;default_win_by_two:boolean;default_point_cap:number}[];tournaments:{id:string;name:string;status:string}[];teams:{id:string;name:string;tournament_id:string}[];players:RosterPlayer[];matches:(Match&{team_a_id?:string;team_b_id?:string;tie_id?:string})[];profiles:Profile[];assignments:{match_id:string;user_id:string}[];role:string;userId:string};
export function useOrganizer(){const [data,setData]=useState<OrganizerData|null>(null);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{const db=supabaseBrowser();if(!db){setError("Connect a separate Supabase project to enable the secure organizer dashboard.");setLoading(false);return;}
  const session=(await db.auth.getSession()).data.session;if(!session){setError("Sign in with your organizer account.");setLoading(false);return;}
  try{const res=await fetch("/api/admin/overview",{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"});const body=await res.json();if(!res.ok)throw Error(body.error||"Unable to load");setData(body);setError("");}
  catch(e){setData(null);setError(e instanceof Error?e.message:"Unable to load");}finally{setLoading(false);} },[]);
 useEffect(()=>{void refresh()},[refresh]);
 const post=useCallback(async(path:string,body:Record<string,unknown>)=>{const db=supabaseBrowser();if(!db)throw Error("Database not configured");const session=(await db.auth.getSession()).data.session;if(!session)throw Error("Please sign in again");const res=await fetch(`/api/admin/${path}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(body)});const result=await res.json();if(!res.ok)throw Error(result.error||"Request failed");await refresh();return result;},[refresh]);
 return {data,error,loading,refresh,post};}
