"use client";
import {useEffect} from "react";
import {useLiveCourt} from "@/lib/use-live-court";
import {gamesWon} from "@/lib/types";

/** Private, read-only graphics for OBS Browser Source; access checked by the server route. */
export default function OverlayClient({court}:{court:number}){
 const {match:m,loading,error}=useLiveCourt(court);
 useEffect(()=>{document.body.classList.add("overlay-body");return()=>document.body.classList.remove("overlay-body");},[]);
 return <div className="overlay-root" style={{background:"transparent"}}>
  {m?<div className="overlay-score">
   <div className="overlay-top"><span>S TOURNAMENT • COURT {String(court).padStart(2,"0")}</span><span>{m.status.toUpperCase()}</span></div>
   <div className="overlay-name"><span>{m.side_a}</span><div className="row"><span style={{fontSize:14,color:"#9aafc5"}}>{gamesWon(m,"a")}</span><span key={"a-"+m.score_a} className={"overlay-val "+(m.score_a>m.score_b?"win":"")}>{m.score_a}</span></div></div>
   <div className="overlay-name" style={{borderTop:"1px solid #2a3c4e"}}><span>{m.side_b}</span><div className="row"><span style={{fontSize:14,color:"#9aafc5"}}>{gamesWon(m,"b")}</span><span key={"b-"+m.score_b} className={"overlay-val "+(m.score_b>m.score_a?"win":"")}>{m.score_b}</span></div></div>
   <div className="overlay-foot"><span>{m.round}</span><span>{m.status==="completed"?"MATCH FINAL":"GAME "+m.current_game+" • BEST OF "+m.best_of}</span></div>
  </div>:<div className="overlay-score" role="status" aria-live="polite">
   <div className="overlay-top"><span>S TOURNAMENT • COURT {String(court).padStart(2,"0")}</span><span>{error?"OFFLINE":loading?"CONNECTING":"STANDBY"}</span></div>
   <div style={{padding:"16px 22px",minWidth:450,maxWidth:600}}>
    <div style={{fontSize:18,fontWeight:800,letterSpacing:".6px"}}>{error?"SCORE FEED UNAVAILABLE":loading?"CONNECTING TO SCORES":"WAITING FOR MATCH"}</div>
    <div style={{fontSize:13,color:"#abc0d4",marginTop:6}}>{error?"Check the tournament connection; this overlay will retry automatically.":loading?"Loading Court "+court+" scores.":"Overlay ready. Scores appear here once this court has a match."}</div>
   </div>
  </div>}
 </div>;
}
