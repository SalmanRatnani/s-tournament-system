"use client";
import {usePublicScoreboard} from "./use-public-scoreboard";
import {youtubeVideoId} from "./youtube";
export type CourtStream={id:number;youtube_video_id:string|null};
const EMPTY:CourtStream[]=[1,2,3].map(id=>({id,youtube_video_id:null}));
export function useCourtStreams(){
 const feed=usePublicScoreboard(10000);
 const sources=new Map(feed.courts.map(c=>[c.id,youtubeVideoId(c.youtube_video_id||"")]));
 return {courts:EMPTY.map(c=>({...c,youtube_video_id:sources.get(c.id)||null})),loading:feed.loading,error:feed.error};
}
