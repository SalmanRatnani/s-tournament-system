"use client";
import {scoreDeliveryLabel,type ScoreDelivery} from "@/lib/live-score-store";
export function ScoreFeedStatus({delivery,receivedAt}:{delivery:ScoreDelivery;receivedAt:number}){
 return <p className="help-note" role="status" style={{marginTop:12}}>
  <span className={`badge ${delivery==="live"?"live":"scheduled"}`}>{scoreDeliveryLabel(delivery)}</span>
  {receivedAt>0&&<span style={{marginLeft:10}}>Last received {new Date(receivedAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</span>}
 </p>;
}
