"use client";
import {useState} from "react";
import Link from "next/link";
import {ChevronRight,Users,Trophy,ShieldCheck,BookOpen,ArrowUpRight} from "lucide-react";
import {Shell,PageHeading} from "@/components/shell";
import {MBBL_TEAMS,MBBL_SEASON_NAME,MBBL_CATEGORY_ORDER} from "@/lib/mbbl/catalog";
import {CATEGORY_GROUPS,REPLACEMENTS,TRUMP_COUNTS} from "@/lib/mbbl/rules";
import {useTournamentPublic} from "@/lib/use-tournament-public";
function Badge({slug,accent,name}:{slug:string;accent:string;name:string}){return <div className="mbbl-team-crest" style={{borderColor:accent,boxShadow:"inset 0 0 55px "+accent+"33"}} aria-label={name+" team colour"}>
 <span className="mbbl-crest-shuttle" aria-hidden="true">🏸</span><strong>{name.split(" ").map(w=>w[0]).slice(0,2).join("")}</strong><small>{slug.replaceAll("-"," ").toUpperCase()}</small>
 </div>}
export default function MBBLPage(){
 const [selected,setSelected]=useState(MBBL_TEAMS[0].slug);
 const [showRules,setShowRules]=useState(false);
 const {teams:registeredTeams,players:registeredPlayers,loading,error}=useTournamentPublic();
 const team=MBBL_TEAMS.find(t=>t.slug===selected)||MBBL_TEAMS[0];
 const inDb=registeredTeams.find(t=>t.name.toLowerCase()===team.name.toLowerCase());
 const savedCount=inDb?registeredPlayers.filter(p=>p.team_id===inDb.id).length:0;
 return <Shell mode="public" title="MBBL SEASON 1"><div className="content animate-in mbbl-page">
  <PageHeading eyebrow="VANS SPORTS EVENTS · SEASON 1" title={MBBL_SEASON_NAME} subtitle="Six squads. 108 registered players. Nine doubles games per tie. Official team announcement rosters and competition rules." actions={<Link className="btn" href="/live">View live courts <ArrowUpRight size={15}/></Link>}/>
  <div className="mbbl-metrics"><div><strong>06</strong><span>Franchises</span></div><div><strong>108</strong><span>Players</span></div><div><strong>09</strong><span>Doubles games / tie</span></div><div><strong>15</strong><span>League ties</span></div></div>
  {error&&<div className="error" role="alert">{error}</div>}
  <div className="mbbl-team-selector" role="group" aria-label="Choose a team">{MBBL_TEAMS.map(t=><button key={t.slug} type="button" className={"mbbl-team-button"+(selected===t.slug?" active":"")} onClick={()=>setSelected(t.slug)} style={{borderColor:selected===t.slug?t.accent:undefined}}><span className="mbbl-small-badge" style={{background:t.accent}}/>{t.name}</button>)}</div>
  <section className="mbbl-team-detail" style={{["--team-accent" as string]:team.accent}}>
   <div className="mbbl-team-overview"><Badge slug={team.slug} accent={team.accent} name={team.name}/><div><div className="eyebrow">OFFICIAL TEAM ANNOUNCEMENT</div><h2>{team.name}</h2><p>Owner{team.owners.length>1?"s":""}: <strong>{team.owners.join(" & ")}</strong></p><p className="help-note">18 players · A/B/C/K/W/G category registration</p><span className={"badge "+(savedCount===18?"live":"scheduled")}>{loading?"Checking registrations…":savedCount===18?"18/18 in tournament database":"Poster roster preview · "+savedCount+"/18 in database"}</span></div></div>
   <div className="mbbl-roster-grid">{team.players.map(p=><div className="mbbl-player-tile" key={p.category}><span className="mbbl-player-cat">{p.category}</span><strong>{p.name}</strong></div>)}</div>
   <p className="help-note">Player spellings follow the six submitted team posters. Official organisers should verify names against registration records before locking match lineups. The crest above is a colour-matched placeholder, not the original team logo.</p>
  </section>
  <section className="panel panel-pad" style={{marginTop:22}}><div className="row between wrap"><div><div className="eyebrow">THE COMPETITION</div><h2 className="section-title">Season 1 match format</h2></div><button className="btn" onClick={()=>setShowRules(v=>!v)} aria-expanded={showRules}>{showRules?"Hide rules":"Explore official rules"} <BookOpen size={15}/></button></div>
   <p className="subline" style={{marginTop:12}}>League: every team plays five ties. Each tie contains nine compulsory doubles games in fixed category order. The top four advance to 1st vs 4th and 2nd vs 3rd semifinals.</p>
   <div className="mbbl-format-grid"><div><Trophy color="var(--mint)"/><strong>Trump Games</strong><p>3 independently selected per team in league; 2 in semifinals; 1 in final. Trump wins give +2 overall, losses normally −1.</p></div><div><Users color="var(--mint)"/><strong>Mandatory pairs</strong><p>A, B, C, K/W and G+B pairs follow a strict nine-game sequence. Players normally play once per tie.</p></div><div><ShieldCheck color="var(--mint)"/><strong>Knockout relay</strong><p>Equal overall points after nine games triggers a cumulative 30-point relay with A, B and C pair stages.</p></div></div>
   {showRules&&<><h3 className="section-title" style={{marginTop:22}}>Compulsory order of play</h3><div className="panel table-wrap" style={{marginTop:12}}><table className="table"><thead><tr><th>Game</th><th>Group</th><th>Required pair</th></tr></thead><tbody>{CATEGORY_GROUPS.map(g=><tr key={g.number}><td>{g.number}</td><td>{g.group}</td><td>{g.description}</td></tr>)}</tbody></table></div>
    <p className="help-note" style={{marginTop:16}}>All individual games are one game to 15 points. League rankings use overall team points, then games won, then rally-point difference; any unresolved equality uses a separate 21-point Best vs Best game. Knockout tie equality uses the 10/20/30 relay.</p>
    <p className="help-note">Official replacements: K, W or G player nonattendance means a 15–7 walkover. A/B category replacements must follow the published options and are organiser-controlled.</p>
    <div className="mbbl-rule-pills"><span>League Trump: {TRUMP_COUNTS.league}/team</span><span>Semifinal Trump: {TRUMP_COUNTS.semifinal}/team</span><span>Final Trump: {TRUMP_COUNTS.final}/team</span><span>Walkover: 15–7</span><span>Relay: 10 → 20 → 30</span></div>
   </>}
  </section>
  <p className="help-note" style={{marginTop:18}}>Source: MBBL Season 1 official rulebook (provided by the organiser). The live match-scoring engine requires adaptation to this special format before competition starts.</p>
 </div></Shell>;
}
