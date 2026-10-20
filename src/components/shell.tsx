"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity, ArrowRight, BarChart3, CalendarDays, ChevronLeft, ChevronRight,
  Clapperboard, FileUp, GitBranch, LayoutDashboard, LockKeyhole, LogIn,
  Menu, Radio, Settings2, Shield, Trophy, UserCircle2, UserRoundCheck,
  Users, X
} from "lucide-react";
import { demoEnabled } from "@/lib/demo";
import { supabaseBrowser } from "@/lib/supabase";

type Role = "owner" | "admin" | "referee" | "viewer";
type NavLink = { to: string; label: string; Icon: typeof Activity };
type ShellMode = "auto" | "public" | "auth" | "workspace";

const discover: NavLink[] = [
  { to: "/", label: "Overview", Icon: LayoutDashboard },
  { to: "/live", label: "Live courts", Icon: Radio },
  { to: "/schedule", label: "Fixtures", Icon: CalendarDays },
  { to: "/results", label: "Results", Icon: Trophy },
  { to: "/standings", label: "Standings", Icon: BarChart3 },
  { to: "/knockouts", label: "Knockouts", Icon: GitBranch },
  { to: "/teams", label: "Teams", Icon: Shield },
  { to: "/players", label: "Players", Icon: Users },
];
const operations: NavLink[] = [
  { to: "/admin", label: "Command center", Icon: LayoutDashboard },
  { to: "/admin/teams", label: "Squads & rosters", Icon: Users },
  { to: "/admin/fixtures", label: "Competition control", Icon: GitBranch },
  { to: "/admin/referees", label: "Referee allocation", Icon: UserRoundCheck },
  { to: "/admin/users", label: "Referee accounts", Icon: LockKeyhole },
  { to: "/admin/viewer-links", label: "Viewer links & YouTube", Icon: Radio },
  { to: "/admin/scoring-rules", label: "Scoring format", Icon: Settings2 },
  { to: "/admin/import-auction", label: "Auction import", Icon: FileUp },
  { to: "/admin/viewer-links", label: "Public streams", Icon: Clapperboard },
];
const refereeLinks: NavLink[] = [{ to: "/referee", label: "Referee scoring", Icon: UserRoundCheck }];
const publicQuickLinks = discover.slice(1, 5);

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={"brand brand-modern" + (compact ? " brand-compact" : "")} aria-label="S Tournament home">
      <span className="brand-icon"><Activity size={19} strokeWidth={2.4} /></span>
      {!compact && <span className="brand-wordmark">S TOURNAMENT<small>THE MATCH EXPERIENCE</small></span>}
    </Link>
  );
}
function NavItem({ item, active, onNavigate, collapsed = false }: {
  item: NavLink; active: boolean; onNavigate?: () => void; collapsed?: boolean
}) {
  const Icon = item.Icon;
  return <Link
    href={item.to}
    title={collapsed ? item.label : undefined}
    onClick={onNavigate}
    aria-current={active ? "page" : undefined}
    className={"nav-link" + (active ? " active" : "")}
  ><Icon size={18} strokeWidth={1.85} /><span className={collapsed ? "sr-only" : ""}>{item.label}</span>{!collapsed && active && <ChevronRight size={14} className="nav-link-arrow" />}</Link>;
}
function NavGroup({ label, links, path, onNavigate, collapsed = false }: {
  label: string; links: NavLink[]; path: string; onNavigate?: () => void; collapsed?: boolean
}) {
  return <div className="workspace-nav-group">
    {!collapsed && <div className="nav-group">{label}</div>}
    <nav aria-label={label}>{links.map(item => <NavItem
      key={item.to} item={item} onNavigate={onNavigate} collapsed={collapsed}
      active={item.to === "/" ? path === "/" : path === item.to || path.startsWith(item.to + "/")}
    />)}</nav>
  </div>;
}

export function Shell({ children, title = "TOURNAMENT", mode = "auto" }: {
  children: React.ReactNode; title?: string; mode?: ShellMode
}) {
  const path = usePathname();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [authReady, setAuthReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const db = supabaseBrowser();
    if (!db) { setAuthReady(true); return; }
    let active = true;
    let sequence = 0;
    const refresh = async () => {
      const request = ++sequence;
      try {
        const { data: { user } } = await db.auth.getUser();
        if (!active || request !== sequence) return;
        if (!user) { setEmail(""); setRole("viewer"); setAuthReady(true); return; }
        setEmail(user.email || "");
        const result = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (!active || request !== sequence) return;
        const value = result.data?.role;
        setRole(value === "owner" || value === "admin" || value === "referee" ? value : "viewer");
      } catch {
        if (active && request === sequence) { setEmail(""); setRole("viewer"); }
      } finally { if (active && request === sequence) setAuthReady(true); }
    };
    void refresh();
    const { data: { subscription } } = db.auth.onAuthStateChange(() => { void refresh(); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => { setMenuOpen(false); }, [path]);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem("st.sidebar.collapsed") === "true"); } catch { /* optional preference */ }
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [menuOpen]);

  const isStaff = !!email && (role === "owner" || role === "referee");
  const workspace = mode !== "auth" && mode !== "public" && authReady && isStaff;
  const canOrganize = role === "owner";
  const userDestination = canOrganize ? "/admin" : role === "referee" ? "/referee" : "/live";
  const publicHeader = <header className="public-header">
    <div className="public-header-inner">
      <Brand />
      <nav className="public-desktop-links" aria-label="Explore tournament">
        {publicQuickLinks.map(item => <Link key={item.to} href={item.to} aria-current={path === item.to ? "page" : undefined}>{item.label}</Link>)}
      </nav>
      <div className="public-header-actions">
        {demoEnabled && <span className="demo-flag public-demo-flag">DEMO DATA</span>}
        <Link href={email ? userDestination : "/login"} className="btn public-signin" title="For Main Controller and assigned referees only">
          {email && isStaff ? <UserCircle2 size={16} /> : <LogIn size={16} />}{email && isStaff ? "Staff workspace" : "Staff login"}<ArrowRight size={15} />
        </Link>
        <button type="button" className="icon-btn public-menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen} aria-controls="public-mobile-menu" onClick={() => setMenuOpen(value => !value)}>
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>
    </div>
    {menuOpen && <nav id="public-mobile-menu" className="public-mobile-menu" aria-label="Mobile tournament navigation">
      {discover.map(item => <Link onClick={() => setMenuOpen(false)} key={item.to} href={item.to}><item.Icon size={17} />{item.label}</Link>)}

    </nav>}
  </header>;

  if (!workspace) return <div className={"public-shell" + (mode === "auth" ? " auth-shell" : "")}>
    {publicHeader}
    <main id="main-content" className="public-main">{children}</main>
    <footer className="public-footer"><span>S TOURNAMENT <span className="text-green">•</span> BUILT FOR THE GAME</span><span>Public scores • Independent court broadcasts</span></footer>
  </div>;

  const sidebar = (mobile: boolean) => <div className="sidebar-inner">
    <div className="sidebar-brand-row"><Brand compact={!mobile && collapsed} />
      {mobile ? <button type="button" className="icon-btn" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={20} /></button> : <button
        type="button" className="icon-btn collapse-control" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={() => setCollapsed(value => { const next = !value; try { localStorage.setItem("st.sidebar.collapsed", String(next)); } catch {} return next; })}>
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>}
    </div>
    <div className="sidebar-scroll">
      <NavGroup label="Tournament" links={discover} path={path} collapsed={!mobile && collapsed} onNavigate={() => setMenuOpen(false)} />
      {canOrganize && <NavGroup label="Operations" links={operations} path={path} collapsed={!mobile && collapsed} onNavigate={() => setMenuOpen(false)} />}
      {role === "referee" && <NavGroup label="Officiating" links={refereeLinks} path={path} collapsed={!mobile && collapsed} onNavigate={() => setMenuOpen(false)} />}
      {canOrganize && <NavGroup label="Court control" links={refereeLinks} path={path} collapsed={!mobile && collapsed} onNavigate={() => setMenuOpen(false)} />}
    </div>
    <div className="sidebar-bottom">
      <Link href="/account" onClick={() => setMenuOpen(false)} className="workspace-account">
        <span className="workspace-avatar">{email.charAt(0).toUpperCase()}</span>
        {(mobile || !collapsed) && <span><strong>{email.split("@")[0]}</strong><small>{role.toUpperCase()} ACCOUNT</small></span>}
      </Link>
    </div>
  </div>;

  return <div className={"app-layout workspace-layout" + (collapsed ? " sidebar-collapsed" : "")}>
    <aside className="sidebar workspace-sidebar" aria-label="Workspace navigation">{sidebar(false)}</aside>
    {menuOpen && <button type="button" className="mobile-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    <aside id="workspace-mobile-menu" className={"workspace-mobile-drawer" + (menuOpen ? " open" : "")} aria-label="Mobile workspace navigation" aria-hidden={!menuOpen}>{sidebar(true)}</aside>
    <main className="main workspace-main" id="main-content">
      <header className="topbar workspace-topbar">
        <div className="row">
          <button type="button" className="icon-btn workspace-hamburger" aria-label="Open workspace menu" aria-expanded={menuOpen} aria-controls="workspace-mobile-menu" onClick={() => setMenuOpen(true)}><Menu size={22} /></button>
          <span className="topbar-breadcrumb"><span>WORKSPACE</span><ChevronRight size={14} /><strong>{title}</strong></span>
        </div>
        <div className="top-right">
          {demoEnabled && <span className="demo-flag">LOCAL DEMO • NOT SYNCED</span>}
          <span className="role-chip">{role.toUpperCase()}</span>
          <Link href="/account" className="topbar-account" aria-label="Your account"><UserCircle2 size={19} /><span>Account</span></Link>
        </div>
      </header>
      {children}
    </main>
  </div>;
}
export function PageHeading({ eyebrow, title, subtitle, actions }: {
  eyebrow: string; title: string; subtitle: string; actions?: React.ReactNode
}) {
  return <div className="between wrap row page-heading">
    <div><div className="eyebrow">{eyebrow}</div><h1 className="headline display">{title}</h1><p className="subline">{subtitle}</p></div>
    {actions}
  </div>;
}
export function SectionHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return <div className="section-head"><h2 className="section-title">{title}</h2>{action}</div>;
}
