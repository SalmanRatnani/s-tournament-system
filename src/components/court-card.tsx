import Link from "next/link";import {ArrowUpRight,MonitorPlay} from "lucide-react";import type {Match} from "@/lib/types";import {gamesWon,gameLabel} from "@/lib/types";
export function StatusBadge({status}:{status:Match["status"]}){return <span className={`badge ${status}`}>{status==="live"?"● LIVE":status.toUpperCase()}</span>}
export function CourtCard({m}:{m:Match}){return <div className="panel court-card animate-in">
 <div className="court-top"><strong style={{fontSize:15}}>COURT {String(m.court_id).padStart(2,"0")}</strong><StatusBadge status={m.status}/></div>
 <div className="court-caption">{m.round}</div><div className="players"><div className="player-row"><span className="player-name">{m.side_a}</span><div className="row"><span className="game-indicator">{gamesWon(m,"a")}</span><strong className={`score-numbers ${m.score_a>m.score_b?"leading":""}`}>{m.score_a}</strong></div></div>
 <div className="player-row"><span className="player-name">{m.side_b}</span><div className="row"><span className="game-indicator">{gamesWon(m,"b")}</span><strong className={`score-numbers ${m.score_b>m.score_a?"leading":""}`}>{m.score_b}</strong></div></div></div>
 <div className="between row"><span className="game-indicator">{gameLabel(m)} • BEST OF {m.best_of}</span><span className="game-indicator">SET {gamesWon(m,"a")} – {gamesWon(m,"b")}</span></div>
 <div className="court-footer"><Link className="btn" style={{flex:1}} href={`/watch/${m.court_id}`}><MonitorPlay size={14}/> Watch <ArrowUpRight size={13}/></Link></div>
 </div>}
