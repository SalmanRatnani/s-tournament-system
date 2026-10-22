"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {ArrowUpRight,Search,Trophy,Radio} from "lucide-react";
import {Shell,PageHeading} from "@/components/shell";
import {useMatches} from "@/lib/use-matches";
import {gamesWon} from "@/lib/types";
export default function Results(){
 const {matches,loading,error}=useMatches();
 const [query,setQuery]=useState("");
 const [view,setView]=useState<"all"|"rubbers"|"ties">("all");
 const finished=useMemo(()=>matches.filter(m=>m.status==="completed").sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at)),[matches]);
 const filtered=finished.filter(m=>(view==="all"||view==="ties"&&m.kind==="team_tie"||view==="rubbers"&&m.kind!=="team_tie")&&[m.side_a,m.side_b,m.round,"Court "+m.court_id].some(x=>x.toLowerCase().includes(query.trim().toLowerCase())));
 return <Shell title="MATCH RESULTS" mode="public"><div className="content animate-in">
  <PageHeading eyebrow="THE RECORD BOOK" title="Match results" subtitle="Every completed tie and match, recorded from the official tournament scoreboard." actions={<Link href="/live" className="btn"><Radio size={15}/> Live courts <ArrowUpRight size={14}/></Link>}/>
  <div className="grid cols-3" style={{marginBottom:23}}>
   <div className="panel stat"><div className="stat-label">All results</div><div className="stat-value">{finished.length}</div><div className="stat-sub">Completed matches and team ties</div></div>
   <div className="panel stat"><div className="stat-label">Individual rubbers</div><div className="stat-value">{finished.filter(m=>m.kind!=="team_tie").length}</div><div className="stat-sub">Singles and doubles</div></div>
   <div className="panel stat"><div className="stat-label">Team ties</div><div className="stat-value">{finished.filter(m=>m.kind==="team_tie").length}</div><div className="stat-sub">League and playoff ties</div></div>
  </div>
  <div className="results-toolbar"><div className="results-filters" role="group" aria-label="Filter results">{([{id:"all",label:"All results"},{id:"rubbers",label:"Matches"},{id:"ties",label:"Team ties"}] as const).map(item=><button type="button" key={item.id} className={"btn "+(view===item.id?"btn-primary":"")} aria-pressed={view===item.id} onClick={()=>setView(item.id)}>{item.label}</button>)}</div>
   <label className="results-search"><Search size={17}/><span className="sr-only">Search results</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search players, teams or rounds"/></label>
  </div>
  {error&&<div className="error" role="alert">{error}</div>}
  {loading?<div className="panel empty" role="status">Loading official results…</div>:filtered.length===0?<div className="panel empty results-empty"><Trophy size={34} color="var(--mint)"/><h2>{finished.length?"No results match those filters":"The story starts with the first match"}</h2><p>{finished.length?"Try another search or category.":"Official results will appear here once a match is completed."}</p><Link className="btn btn-primary" href="/schedule">View fixtures <ArrowUpRight size={15}/></Link></div>:<div className="results-list">{filtered.map(m=><article className="panel result-row" key={m.id}>
   <div className="result-meta"><span>{m.round}</span><span>COURT {String(m.court_id).padStart(2,"0")}</span><span>{m.kind==="team_tie"?"TEAM TIE":m.kind.toUpperCase()}</span></div>
   <div className="result-main"><div className="result-side"><span className={m.winner==="a"?"result-winner":""}>{m.side_a}</span><span className={m.winner==="b"?"result-winner":""}>{m.side_b}</span></div>
    <div className="result-scores"><strong>{m.kind==="team_tie"?m.score_a:gamesWon(m,"a")}</strong><strong>{m.kind==="team_tie"?m.score_b:gamesWon(m,"b")}</strong></div></div>
   <div className="result-foot"><span className="badge completed">FINAL</span>{m.kind!=="team_tie"&&<span>Last game {m.score_a}–{m.score_b}</span>}<Link href={"/watch/"+m.court_id}>Court {m.court_id} <ArrowUpRight size={13}/></Link></div>
  </article>)}</div>}
 </div></Shell>;
}
