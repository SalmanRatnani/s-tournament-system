"use client";
import {useState} from "react";
import {Organizer,ErrorNotice} from "@/components/organizer";
import {validateAuctionHandoff,type AuctionHandoff} from "@/lib/auction-handoff";
export default function ImportAuctionPage(){
 const [handoff,setHandoff]=useState<AuctionHandoff|null>(null),[filename,setFilename]=useState(""),[error,setError]=useState(""),[success,setSuccess]=useState(""),[busy,setBusy]=useState(false);
 return <Organizer title="Import finished auction" subtitle="Preview six teams and 108 players before importing. Your auction database is never modified.">{({data,post})=>{
  const tournamentId=data?.tournaments[0]?.id||"";const imported=data?.teams.length||0;
  return <div className="grid cols-2">
   <div className="panel panel-pad"><h2 className="section-title">Select auction export</h2><p className="subline">Upload the completed-auction JSON from the S Auction System. Maximum 2 MB, format v1. No live sync or production changes until you confirm.</p>
    <label className="field">Choose JSON file<input type="file" accept=".json,application/json" className="input" onChange={async e=>{setError("");setSuccess("");setHandoff(null);const file=e.target.files?.[0];if(!file)return;setFilename(file.name);try{if(file.size>2_000_000)throw Error("Maximum 2 MB");const obj=JSON.parse(await file.text());setHandoff(validateAuctionHandoff(obj));}catch(e){setError(e instanceof Error?e.message:String(e))}}}/></label>
    <p className="help-note">Import is allowed only while registration is open and no teams or fixtures exist. Player pictures are transferred as image names and HTTPS references; the original image bytes are not included in this JSON.</p>
    <button className="btn btn-primary" disabled={!handoff||!tournamentId||imported>0||busy} style={{marginTop:17}} onClick={async()=>{if(!handoff||!confirm(`Import ${handoff.teams.length} teams and 108 players into this empty tournament?`))return;setBusy(true);setError("");try{const res=await post("import-auction",{tournamentId,document:handoff});setSuccess(`Imported ${res.result.teams} teams and ${res.result.players} players.`);setHandoff(null)}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}}>{busy?"Importing…":"Confirm & import rosters"}</button>
    {!tournamentId&&<p className="help-note">Create your tournament in Teams & Rosters first.</p>}{imported>0&&<p className="help-note">This tournament already has {imported} teams. Import requires a blank tournament.</p>}
    {success&&<p style={{color:"var(--mint)"}} role="status">{success}</p>}<ErrorNotice message={error}/>
   </div><div className="panel panel-pad"><h2 className="section-title">Validation preview</h2>
    {!handoff?<p className="subline">Select an export to preview team allocations, player names and photos before you import.</p>:<><p className="help-note">{filename} • {handoff.teams.length} teams • {handoff.teams.reduce((a,t)=>a+t.players.length,0)} players</p>
     <div style={{maxHeight:420,overflowY:"auto",marginTop:13}}>{handoff.teams.map(t=><div key={t.source_team_id} style={{marginBottom:16}}><strong>{t.name}</strong> <span className="badge">{t.players.length}/18</span><p className="help-note">{t.players.filter(p=>p.image_url).length} linked images • {t.players.filter(p=>p.is_captain).length} captains</p><ol className="roster-list">{t.players.map(p=><li key={p.source_player_id}>{p.name}{p.category?` — ${p.category}`:""}{p.image_filename?` (${p.image_filename})`:""}</li>)}</ol></div>)}</div></>}
   </div></div>;
 }}</Organizer>
}
