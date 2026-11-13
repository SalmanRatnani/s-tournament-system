"use client";
import {useCallback,useEffect,useSyncExternalStore} from "react";
import type {Match} from "@/lib/types";
import {demoEnabled,getDemoMatches} from "@/lib/demo";
import type {MBBLFixtureSlot} from "@/lib/mbbl/overlay-display";
import {createSnapshotStore} from "./snapshot-store";
import {createLiveScoreStore} from "./live-score-store";
import type {MBBLStandings} from "./mbbl/standings";

export type PublicTieGame={tie_id:string;game_number:number;score_a:number;score_b:number;status:string;category_a:string[];category_b:string[];trump_a:boolean|null;trump_b:boolean|null};
export type PublicMBBLTie={id:string;fixture_slot_id:string;tournament_id:string;court_id:number;team_a_id:string;team_b_id:string;status:string;active_game:number;score_a:number;score_b:number;overall_a:number;overall_b:number;version:number;updated_at:string;games:PublicTieGame[]};
export type PublicEventSnapshot={
 courts:{id:number;youtube_video_id:string|null}[];
 fixtures:MBBLFixtureSlot[];
 teams:{id:string;name:string;tournament_id:string}[];
 players:{id:string;team_id:string;name:string;category:string|null;player_code:string|null;image_url:string|null;image_filename:string|null;is_captain:boolean;is_playing_captain:boolean}[];
 generatedAt?:string;
 websocketUrl?:string;
};
export type PublicScores={matches:Match[];mbblTies:PublicMBBLTie[];standings?:MBBLStandings;generatedAt?:string};
export type PublicScoreSnapshot=PublicEventSnapshot&PublicScores;
const EVENT_EMPTY:PublicEventSnapshot={courts:[],fixtures:[],teams:[],players:[]};
const SCORES_EMPTY:PublicScores={matches:demoEnabled?getDemoMatches():[],mbblTies:[]};
const eventStore=createSnapshotStore({url:"/api/public/event",initial:EVENT_EMPTY});
export const scoresAreNewer=(next:PublicScores,previous:PublicScores)=>!previous.generatedAt||Boolean(next.generatedAt&&Date.parse(next.generatedAt)>=Date.parse(previous.generatedAt));
const scoresStore=createLiveScoreStore(SCORES_EMPTY);
function useStore<T>(store:ReturnType<typeof createSnapshotStore<T>>,refreshMs:number){
 const subscribe=useCallback((listener:()=>void)=>demoEnabled?()=>{}:store.subscribe(listener,refreshMs),[store,refreshMs]);
 return {...useSyncExternalStore(subscribe,store.getSnapshot,store.getServerSnapshot),refresh:store.refresh};
}
/** Schedule/rosters change slowly; live match status uses the compact score feed. */
export function usePublicEvent(refreshMs=300000){
 const state=useStore(eventStore,refreshMs);
 return {...state.data,loading:!demoEnabled&&state.loading,error:state.error,refresh:state.refresh};
}
export function usePublicScoreboard(refreshMs=0){
 const event=usePublicEvent();
 const scores=useStore(scoresStore,refreshMs);
 useEffect(()=>{if(!demoEnabled)scoresStore.configure(event.websocketUrl||"");},[event.websocketUrl]);
 const delivery=useSyncExternalStore(scoresStore.subscribeDelivery,scoresStore.getDelivery,scoresStore.getServerDelivery);
 return {...event,...scores.data,delivery,receivedAt:scores.receivedAt,loading:!demoEnabled&&(event.loading||scores.loading),error:event.error||scores.error,
  refresh:()=>Promise.all([event.refresh(),scores.refresh()])};
}
/** A signed OBS URL has its own fast feed; public viewers never start this timer. */
export function createOverlayScoreStore(court:number,token:string){
 return createSnapshotStore({url:`/api/overlay/${court}/scoreboard`,initial:SCORES_EMPTY,headers:{Authorization:`Bearer ${token}`},accept:scoresAreNewer});
}
export function useOverlayScores(store:ReturnType<typeof createOverlayScoreStore>){return useStore(store,1000);}
