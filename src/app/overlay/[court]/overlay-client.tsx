"use client";
import {useEffect} from "react";
import {useCourt} from "@/lib/use-matches";
import {gamesWon} from "@/lib/types";
export default function OverlayClient({court}:{court:number}){
 const {match:m}=useCourt(court);
 useEffect(()=>{document.body.classList.add("overlay-body");return()=>document.body.classList.remove("overlay-body");},[]);
 return <div className="overlay-root" style={{background:"transparent"}}>{m&&<div className="overlay-score"><div className="overlay-top"><span>S TOURNAMENT • COURT {String(court).padStart(2,"0")}</span><span>{m.status.toUpperCase()}</span></div>
 <div className="overlay-name"><span>{m.side_a}</span><div className="row"><span style={{fontSize:14,color:"#9aafc5"}}>{gamesWon(m,"a")}</span><span key={"a-"+m.score_a} className={"overlay-val "+(m.score_a>m.score_b?"win":"")}>{m.score_a}</span></div></div>
 <div className="overlay-name" style={{borderTop:"1px solid #2a3c4e"}}><span>{m.side_b}</span><div className="row"><span style={{fontSize:14,color:"#9aafc5"}}>{gamesWon(m,"b")}</span><span key={"b-"+m.score_b} className={"overlay-val "+(m.score_b>m.score_a?"win":"")}>{m.score_b}</span></div></div>
 <div className="overlay-foot"><span>{m.round}</span><span>{m.status==="completed"?"MATCH FINAL":"GAME "+m.current_game+" • BEST OF "+m.best_of}</span></div></div>}</div>;
}
