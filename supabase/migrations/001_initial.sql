-- s-tournament-system schema. Run in a NEW, separate Supabase project.
-- Auth users are provisioned via the Supabase Auth dashboard. Never reuse the auction database.
create extension if not exists pgcrypto;

create table public.tournaments (
 id uuid primary key default gen_random_uuid(), name text not null,
 type text not null default 'individual' check(type in ('individual','team','mixed')),
 status text not null default 'upcoming' check(status in ('upcoming','live','completed')),
 venue text, starts_on date, created_at timestamptz not null default now()
);
create table public.courts (
 id int primary key check(id between 1 and 3), name text not null unique,
 youtube_video_id text
);
insert into public.courts(id,name) values (1,'Court 01'),(2,'Court 02'),(3,'Court 03');
create table public.teams (id uuid primary key default gen_random_uuid(),tournament_id uuid references public.tournaments(id),name text not null,created_at timestamptz not null default now());
create table public.players (id uuid primary key default gen_random_uuid(),name text not null,team_id uuid references public.teams(id),created_at timestamptz not null default now());
create table public.matches (
 id uuid primary key default gen_random_uuid(), tournament_id uuid not null references public.tournaments(id),
 court_id int not null references public.courts(id),round text not null default 'GROUP STAGE',
 kind text not null check(kind in ('singles','doubles','team_tie')),tie_id uuid references public.matches(id),
 side_a text not null,side_b text not null,
 status text not null default 'scheduled' check(status in ('scheduled','live','paused','completed')),
 score_a int not null default 0 check(score_a between 0 and 30),score_b int not null default 0 check(score_b between 0 and 30),
 games jsonb not null default '[]'::jsonb check(jsonb_typeof(games)='array'),
 current_game int not null default 1 check(current_game between 1 and 5),
 best_of int not null default 3 check(best_of in (1,3,5)),
 winning_score int not null default 21 check(winning_score between 1 and 30),
 win_by_two boolean not null default true,point_cap int not null default 30 check(point_cap between 1 and 30),
 winner text check(winner in ('a','b')), version bigint not null default 0,
 youtube_video_id text,updated_at timestamptz not null default now()
);
-- Only one live/paused fixture per court; completed and scheduled fixtures are unaffected.
create unique index one_active_match_per_court on public.matches(court_id) where status in ('live','paused');
create index matches_by_tournament on public.matches(tournament_id,status,court_id);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null,role text not null default 'referee' check(role in ('admin','referee')),
 created_at timestamptz not null default now()
);
create table public.referee_assignments (
 match_id uuid not null references public.matches(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 primary key(match_id,user_id)
);
create table public.score_events (
 id bigint generated always as identity primary key,
 match_id uuid not null references public.matches(id),
 request_id uuid not null unique,
 actor uuid references auth.users(id),
 action text not null check(action in ('point','undo')),
 side text check(side in ('a','b')),
 before_state jsonb not null,after_state jsonb not null,
 created_at timestamptz not null default now()
);
create index score_events_match_recent on public.score_events(match_id,id desc);
create table public.match_audit (
 id bigint generated always as identity primary key,
 match_id uuid not null references public.matches(id), actor uuid references auth.users(id),
 previous_status text not null,new_status text not null,created_at timestamptz not null default now()
);

alter table public.tournaments enable row level security;
alter table public.courts enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.profiles enable row level security;
alter table public.referee_assignments enable row level security;
alter table public.score_events enable row level security;
alter table public.match_audit enable row level security;

create policy tournament_read on public.tournaments for select to anon,authenticated using (true);
create policy court_read on public.courts for select to anon,authenticated using (true);
create policy team_read on public.teams for select to anon,authenticated using (true);
create policy player_read on public.players for select to anon,authenticated using (true);
create policy match_read on public.matches for select to anon,authenticated using (true);
create policy own_profile_read on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy own_assignments_read on public.referee_assignments for select to authenticated using ((select auth.uid())=user_id);
-- No public inserts, updates or deletes. Only trusted server service role writes via RPC.
-- Expose public matches to Realtime; public subscriber receives committed updates.
do $$ begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
  create publication supabase_realtime;
 end if;
end $$;
alter publication supabase_realtime add table public.matches;

-- Atomic & idempotent scoring, guarded by server-side JWT authorization AND DB row lock.
-- SECURITY INVOKER uses the restricted server-side service role, never the browser anon key.
create or replace function public.apply_score_action(
 p_match_id uuid,p_side text,p_action text,p_request_id uuid,p_actor uuid
) returns public.matches language plpgsql security invoker set search_path = '' as $$
declare
 m public.matches%rowtype;
 previous jsonb;
 current_state jsonb;
 prior public.score_events%rowtype;
 ga int;gb int;aw int;bw int;
 new_games jsonb;
begin
 if p_side not in ('a','b') or p_action not in ('point','undo') then raise exception 'Invalid action';end if;
 -- Locks row to serialize referee taps; check idempotency AFTER lock.
 select * into m from public.matches where id=p_match_id for update;
 if not found then raise exception 'Match not found';end if;
 if exists(select 1 from public.score_events where request_id=p_request_id) then
  return m;
 end if;
 if (p_action='point' and m.status<>'live') or (p_action='undo' and m.status not in ('live','completed')) then raise exception 'Match is not live';end if;
 previous=to_jsonb(m);
 if p_action='undo' then
  select * into prior from public.score_events where match_id=p_match_id order by id desc limit 1;
  if not found or prior.action<>'point' then raise exception 'Nothing to undo';end if;
  if m.status='completed' and prior.created_at < now() - interval '60 seconds' then raise exception 'Final result locked; ask organizer to correct it';end if;
  m.score_a=(prior.before_state->>'score_a')::int;
  m.score_b=(prior.before_state->>'score_b')::int;
  m.games=prior.before_state->'games';
  m.current_game=(prior.before_state->>'current_game')::int;
  m.winner=prior.before_state->>'winner';
  m.status=(prior.before_state->>'status');
 else
  if p_side='a' then m.score_a=m.score_a+1;else m.score_b=m.score_b+1;end if;
  ga=m.score_a;gb=m.score_b;
  if ((greatest(ga,gb)>=m.winning_score and (not m.win_by_two or abs(ga-gb)>=2)) or greatest(ga,gb)>=m.point_cap) then
   new_games=m.games||jsonb_build_array(jsonb_build_object('a',ga,'b',gb));
   m.games=new_games;
   select count(*) filter (where (g->>'a')::int>(g->>'b')::int),count(*) filter (where (g->>'b')::int>(g->>'a')::int) into aw,bw from jsonb_array_elements(new_games) g;
   if greatest(aw,bw)>=((m.best_of+1)/2) then m.status='completed';m.winner=case when aw>bw then 'a' else 'b' end;
   else m.current_game=m.current_game+1;m.score_a=0;m.score_b=0;end if;
  end if;
 end if;
 m.version=m.version+1;
 m.updated_at=now();
 update public.matches set score_a=m.score_a,score_b=m.score_b,games=m.games,current_game=m.current_game,
  status=m.status,winner=m.winner,version=m.version,updated_at=m.updated_at where id=m.id;
 select to_jsonb(row_data) into current_state from (select * from public.matches where id=m.id) row_data;
 insert into public.score_events(match_id,request_id,actor,action,side,before_state,after_state)
 values(m.id,p_request_id,p_actor,p_action,p_side,previous,current_state);
 return m;
end $$;

create or replace function public.set_match_status(p_match_id uuid,p_status text,p_actor uuid)
returns public.matches language plpgsql security invoker set search_path='' as $$
declare m public.matches%rowtype;old_status text;
begin
 if p_status not in ('scheduled','live','paused') then raise exception 'Invalid match status';end if;
 select * into m from public.matches where id=p_match_id for update;
 if not found then raise exception 'Match not found';end if;
 if m.status='completed' then raise exception 'Completed matches cannot be reopened';end if;
 old_status=m.status;
 update public.matches set status=p_status,version=version+1,updated_at=now() where id=p_match_id returning * into m;
 insert into public.match_audit(match_id,actor,previous_status,new_status) values(p_match_id,p_actor,old_status,p_status);
 return m;
end $$;

revoke all on function public.apply_score_action(uuid,text,text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.set_match_status(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.apply_score_action(uuid,text,text,uuid,uuid) to service_role;
grant execute on function public.set_match_status(uuid,text,uuid) to service_role;

-- DEVELOPMENT SEED (optional): create a tournament/matches through a separate SQL script or admin tooling.
