"use client";
import Link from "next/link";import {usePathname} from "next/navigation";
import {Activity,BarChart3,CalendarDays,ChevronRight,Clapperboard,Cog,Gamepad2,GitBranch,LayoutDashboard,LogIn,Radio,Shield,Target,Trophy,Users,Video} from "lucide-react";
import {demoEnabled} from "@/lib/demo";
import {supabaseBrowser} from "@/lib/supabase";
import {useEffect,useState} from "react";
const links=[
 {to:"/",label:"Dashboard",Icon:LayoutDashboard},{to:"/live",label:"Live Courts",Icon:Radio},
 {to:"/schedule",label:"Match Schedule",Icon:CalendarDays},{to:"/results",label:"Results",Icon:Trophy},
 {to:"/brackets",label:"Draws & Brackets",Icon:GitBranch},{to:"/standings",label:"Standings",Icon:BarChart3},{to:"/knockouts",label:"Knockouts",Icon:GitBranch},
 {to:"/tournaments",label:"Tournaments",Icon:Target},{to:"/players",label:"Players",Icon:Users},
 {to:"/teams",label:"Teams",Icon:Shield},{to:"/broadcast",label:"Broadcast Studio",Icon:Clapperboard},
 {to:"/referee",label:"Referee Console",Icon:Gamepad2},{to:"/admin",label:"Organizer",Icon:Cog},
];
export function Shell({children,title="TOURNAMENT CONTROL"}:{children:React.ReactNode,title?:string}){
 const path=usePathname();const [email,setEmail]=useState("");useEffect(()=>{const db=supabaseBrowser();if(!db)return;void db.auth.getUser().then(r=>setEmail(r.data.user?.email||""));const {data:{subscription}}=db.auth.onAuthStateChange((_event,session)=>setEmail(session?.user.email||""));return()=>subscription.unsubscribe()},[]);return <div className="app-layout"><aside className="sidebar">
  <Link href="/" className="brand"><span className="brand-icon"><Activity size={21}/></span><span>S TOURNAMENT<small>LIVE SYSTEM</small></span></Link>
  <div className="nav-group">Tournament</div>
  <nav>{links.slice(0,10).map(({to,label,Icon})=><Link key={to} href={to} className={`nav-link ${path===to?"active":""}`}><Icon size={17}/>{label}</Link>)}</nav>
  <div className="nav-group">Operations</div><nav>{links.slice(10).map(({to,label,Icon})=><Link key={to} href={to} className={`nav-link ${path===to?"active":""}`}><Icon size={17}/>{label}</Link>)}</nav>
  <div className="nav-footer"><div className="row" style={{fontSize:12,marginBottom:7}}><span className="dot"/>Broadcast ready</div><small>3 connected court slots<br/>Independent score feeds</small></div>
 </aside><main className="main"><header className="topbar"><div className="row"><span className="location">S TOURNAMENT <ChevronRight size={12} style={{verticalAlign:"middle",margin:"0 5px"}}/> {title}</span></div><div className="top-right">{demoEnabled&&<span className="demo-flag">LOCAL DEMO • NOT SYNCED ONLINE</span>}<span style={{fontSize:12,color:"#b9c7d9"}}><span className="dot"/>SYSTEM</span><Link href={email?"/account":"/login"} className="btn"><LogIn size={14}/>{email?"My Account":"Sign in"}</Link></div></header>
 <div className="mobile-nav">{links.map(l=><Link key={l.to} href={l.to}>{l.label}</Link>)}</div>{children}</main></div>;
}
export function PageHeading({eyebrow,title,subtitle,actions}:{eyebrow:string,title:string,subtitle:string,actions?:React.ReactNode}){return <div className="between wrap row" style={{marginBottom:26}}><div><div className="eyebrow">{eyebrow}</div><h1 className="headline display">{title}</h1><p className="subline" style={{marginBottom:0}}>{subtitle}</p></div>{actions}</div>}
export function SectionHead({title,action}:{title:string,action?:React.ReactNode}){return <div className="section-head"><h2 className="section-title">{title}</h2>{action}</div>}
