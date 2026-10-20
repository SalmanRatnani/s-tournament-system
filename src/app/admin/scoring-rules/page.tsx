"use client";
import {useEffect,useState} from "react";
import {Organizer,ErrorNotice} from "@/components/organizer";
import {validateGameRules,type GameRules,DEFAULT_GAME_RULES} from "@/lib/scoring-rules";
export default function ScoringRulesPage(){
 const [rules,setRules]=useState<GameRules>(DEFAULT_GAME_RULES);
 const [currentId,setCurrentId]=useState("");
 const [error,setError]=useState("");const [success,setSuccess]=useState("");const [working,setWorking]=useState(false);
 return <Organizer title="Game rules & set format" subtitle="Configure every new singles and doubles rubber; changing rules also updates any unstarted rubbers.">{({data,post})=>{
  const tid=data?.tournaments[0]?.id||"";
  const stored=data?.rules?.find(r=>r.tournament_id===tid);
  // Synchronize only when an organizer loads a different tournament.
  if(tid&&tid!==currentId){queueMicrotask(()=>{setCurrentId(tid);if(stored)setRules({best_of:stored.default_best_of as 1|3,winning_score:stored.default_winning_score,win_by_two:stored.default_win_by_two,point_cap:stored.default_point_cap})})}
  return !tid?<div className="panel panel-pad">Create a tournament under Teams & Rosters before configuring scoring.</div>:<div className="grid cols-2">
   <div className="panel panel-pad"><h2 className="section-title">Match & scoring format</h2>
    <label className="field" style={{marginTop:16}}>Sets per match<select className="input" value={rules.best_of} onChange={e=>setRules(r=>({...r,best_of:Number(e.target.value) as 1|3}))}><option value={1}>1 set — winner takes match</option><option value={3}>Best of 3 sets — first to win 2</option></select></label>
    <label className="field" style={{marginTop:16}}>Target points per set (11–30)<input className="input" type="number" min={11} max={30} value={rules.winning_score} onChange={e=>{const n=Number(e.target.value);setRules(r=>({...r,winning_score:n,point_cap:Math.max(n,r.point_cap)}))}}/></label>
    <label className="field" style={{marginTop:16}}>Maximum score / sudden-death cap (up to 30)<input className="input" type="number" min={Math.max(11,rules.winning_score)} max={30} value={rules.point_cap} onChange={e=>setRules(r=>({...r,point_cap:Number(e.target.value)}))}/></label>
    <label className="row wrap" style={{marginTop:20,gap:12}}><input type="checkbox" checked={rules.win_by_two} onChange={e=>setRules(r=>({...r,win_by_two:e.target.checked}))}/><strong>Enable deuce and two-point advantage</strong></label>
    <p className="help-note">With advantage ON, a player must reach the target and lead by two. At the cap, the next point wins even by one. With advantage OFF, the first to the target wins.</p>
    <button className="btn btn-primary" disabled={working} style={{marginTop:18}} onClick={async()=>{setError("");setSuccess("");setWorking(true);try{const validated=validateGameRules(rules);await post("scoring-rules",{tournamentId:tid,rules:validated});setSuccess("Rules saved. All scheduled rubbers now use this format.")}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setWorking(false)}}}>{working?"Saving…":"Save scoring rules"}</button>
    {success&&<p style={{color:"var(--mint)",marginTop:12}} role="status">{success}</p>}<ErrorNotice message={error}/>
   </div><div className="panel panel-pad"><h2 className="section-title">Quick presets</h2><div className="row wrap" style={{marginTop:12}}>{[11,15,21,30].map(n=><button className="btn" key={n} onClick={()=>setRules(r=>({...r,winning_score:n,point_cap:30}))}>{n} points</button>)}</div>
    <h3 style={{marginTop:23}}>Example: {rules.winning_score} points, {rules.best_of===1?"1 set":"best of 3"}</h3>
    <p className="subline">{rules.win_by_two?`At ${rules.winning_score-1}–${rules.winning_score-1}, play continues until one side leads by two, or reaches ${rules.point_cap}.`:`First to ${rules.winning_score} wins the set, without deuce.`}</p>
    <p className="help-note">Changes are blocked once any rubber in this tournament has started. Team ties remain best-of-five rubbers and are counted separately from the number of sets in each rubber.</p>
   </div></div>
 }}</Organizer>
}
