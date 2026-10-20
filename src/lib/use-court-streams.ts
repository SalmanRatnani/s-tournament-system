"use client";
import {useEffect,useState} from "react";
import {supabaseBrowser} from "./supabase";
import {youtubeVideoId} from "./youtube";
export type CourtStream={id:number;youtube_video_id:string|null};
const EMPTY:CourtStream[]=[1,2,3].map(id=>({id,youtube_video_id:null}));
export function useCourtStreams(){
 const [courts,setCourts]=useState<CourtStream[]>(EMPTY);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{
  const db=supabaseBrowser();
  if(!db){setLoading(false);return;}
  let mounted=true;
  const reload=async()=>{
   const {data,error}=await db.from("courts").select("id,youtube_video_id").order("id");
   if(!mounted)return;
   if(error){setError("Stream information is temporarily unavailable.");}
   else {
    const map=new Map((data||[]).map(row=>[Number(row.id),youtubeVideoId(row.youtube_video_id||"")]));
    setCourts(EMPTY.map(row=>({...row,youtube_video_id:map.get(row.id)||null})));
    setError("");
   }
   setLoading(false);
  };
  void reload();
  const channel=db.channel("public-court-streams").on("postgres_changes",{schema:"public",table:"courts",event:"UPDATE"},()=>void reload()).subscribe();
  const timer=window.setInterval(()=>void reload(),30000);
  return ()=>{mounted=false;clearInterval(timer);void db.removeChannel(channel);};
 },[]);
 return {courts,loading,error};
}
