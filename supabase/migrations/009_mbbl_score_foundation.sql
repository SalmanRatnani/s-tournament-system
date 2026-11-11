-- MBBL Season 1: separate, auditable nine-game scoring foundation.
-- Additive only. Does not create matches, modify fixtures, register staff or
-- activate the unresolved game-ending rule.
create table if not exists public.mbbl_ties (
 id uuid primary key default gen_random_uuid(),
 fixture_slot_id uuid not null unique references public.event_fixture_slots(id) on delete restrict,
 tournament_id uuid not null references public.tournaments(id) on delete restrict,
 court_id integer not null references public.courts(id),
 team_a_id uuid not null references public.teams(id),
 team_b_id uuid not null references public.teams(id),
 status text not null default 'setup' check (status in ('setup','ready','live','paused','awaiting_relay','completed')),
 active_game integer not null default 1 check(active_game between 1 and 9),
 overall_a integer not null default 0,
 overall_b integer not null default 0,
 score_a integer not null default 0,
 score_b integer not null default 0,
 version bigint not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint mbbl_ties_teams_distinct check(team_a_id<>team_b_id)
);
create unique index if not exists mbbl_one_live_tie_per_court
 on public.mbbl_ties(court_id) where status in ('live','paused','awaiting_relay');

create table if not exists public.mbbl_tie_games (
 tie_id uuid not null references public.mbbl_ties(id) on delete cascade,
 game_number integer not null check(game_number between 1 and 9),
 category_a text[] not null,
 category_b text[] not null,
 score_a integer not null default 0 check(score_a between 0 and 30),
 score_b integer not null default 0 check(score_b between 0 and 30),
 trump_a boolean not null default false,
 trump_b boolean not null default false,
 status text not null default 'pending' check (status in ('pending','live','completed','walkover')),
 walkover_by text check(walkover_by in ('a','b')),
 winner text check(winner in ('a','b')),
 started_at timestamptz,
 finished_at timestamptz,
 primary key(tie_id,game_number),
 constraint pair_length check(array_length(category_a,1)=2 and array_length(category_b,1)=2),
 constraint winner_only_after_game check(
   (status in ('pending','live') and winner is null) or
   (status in ('completed','walkover') and winner is not null)
 )
);
create table if not exists public.mbbl_referee_assignments (
 tie_id uuid not null references public.mbbl_ties(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(tie_id,user_id)
);
create table if not exists public.mbbl_score_events (
 id bigint generated always as identity primary key,
 tie_id uuid not null references public.mbbl_ties(id) on delete restrict,
 game_number integer not null,
 request_id uuid not null unique,
 actor uuid not null references auth.users(id),
 side text not null check(side in ('a','b')),
 action text not null check(action in ('point','undo')),
 before_a integer not null,
 before_b integer not null,
 after_a integer not null,
 after_b integer not null,
 tie_version bigint not null,
 created_at timestamptz not null default now()
);
create index if not exists mbbl_score_events_tie_idx on public.mbbl_score_events(tie_id,id);
create index if not exists mbbl_ties_fixture_idx on public.mbbl_ties(tournament_id,fixture_slot_id);
create index if not exists mbbl_ref_assignments_user_idx on public.mbbl_referee_assignments(user_id,tie_id);

-- Do not expose private lineup/trump selections or event logs directly.
alter table public.mbbl_ties enable row level security;
alter table public.mbbl_tie_games enable row level security;
alter table public.mbbl_referee_assignments enable row level security;
alter table public.mbbl_score_events enable row level security;
revoke all on public.mbbl_ties,public.mbbl_tie_games,public.mbbl_referee_assignments,public.mbbl_score_events from public,anon,authenticated;
-- service_role bypasses RLS. Explicit grants for privileged API access.
grant select,insert,update,delete on public.mbbl_ties,public.mbbl_tie_games,public.mbbl_referee_assignments to service_role;
grant select,insert on public.mbbl_score_events to service_role;
grant usage,select on sequence public.mbbl_score_events_id_seq to service_role;

-- Transactional referee-only scoring command. Auth and assignment checked again
-- inside database: never trust actor just because a server API supplied an id.
-- A game at 14–14 pauses scoring until the organiser confirms the official end rule.
create or replace function public.mbbl_apply_score_action(
 p_tie_id uuid,p_game integer,p_side text,p_action text,p_request_id uuid,p_actor uuid,p_expected_version bigint
) returns jsonb language plpgsql security definer
set search_path='' as $$
declare
 t public.mbbl_ties%rowtype;
 g public.mbbl_tie_games%rowtype;
 rule jsonb;
 previous public.mbbl_score_events%rowtype;
 na int;nb int;
begin
 if p_tie_id is null or p_actor is null or p_request_id is null or p_expected_version is null
   or p_side not in ('a','b') or p_action not in ('point','undo') or p_game not between 1 and 9
 then raise exception 'Invalid score command';end if;
 select * into t from public.mbbl_ties where id=p_tie_id for update;
 if not found then raise exception 'Tie not found';end if;
 if not exists(select 1 from public.profiles where id=p_actor and role='owner')
   and not exists (
    select 1 from public.profiles p join public.mbbl_referee_assignments a on a.user_id=p.id
    where p.id=p_actor and p.role='referee' and a.tie_id=t.id
   ) then raise exception 'Referee not assigned to this tie';end if;
 select * into previous from public.mbbl_score_events where request_id=p_request_id;
 if found then
   if previous.tie_id<>p_tie_id or previous.actor<>p_actor or previous.game_number<>p_game
      or previous.action<>p_action or previous.side<>p_side then raise exception 'Replayed request mismatch';end if;
   return jsonb_build_object('tie_id',p_tie_id,'game',p_game,'score_a',previous.after_a,'score_b',previous.after_b,'version',previous.tie_version,'replayed',true);
 end if;
 if t.version<>p_expected_version then raise exception 'Stale tie version';end if;
 if t.status<>'live' or t.active_game<>p_game then raise exception 'Tie is not live on this game';end if;
 select format_metadata into rule from public.tournament_rules where tournament_id=t.tournament_id and format_key='mbbl-s1';
 if not found then raise exception 'MBBL rule set missing';end if;
 if coalesce(rule->>'rally_14_all_resolution','confirmation_pending')='confirmation_pending'
 then raise exception 'Scoring blocked until 14-all rule confirmed';end if;
 select * into g from public.mbbl_tie_games where tie_id=t.id and game_number=p_game for update;
 if not found or g.status<>'live' then raise exception 'Game not live';end if;
 na:=g.score_a;nb:=g.score_b;
 if p_action='point' then
   if p_side='a' then na:=na+1;else nb:=nb+1;end if;
   if na>30 or nb>30 then raise exception 'Maximum score exceeded';end if;
 else
   -- Only the most recent point may be reversed, with full attribution.
   select * into previous from public.mbbl_score_events
    where tie_id=t.id and game_number=p_game and action='point'
    order by id desc limit 1;
   if not found or previous.side<>p_side or previous.after_a<>na or previous.after_b<>nb
   then raise exception 'Nothing to undo on this side';end if;
   if p_side='a' then na:=na-1;else nb:=nb-1;end if;
 end if;
 -- Validated finalisation of games belongs to a separate owner control action.
 -- This command cannot complete ties, select trumps or change lineups.
 update public.mbbl_tie_games set score_a=na,score_b=nb where tie_id=t.id and game_number=p_game;
 update public.mbbl_ties set score_a=na,score_b=nb,version=version+1,updated_at=now()
 where id=t.id returning * into t;
 insert into public.mbbl_score_events(tie_id,game_number,request_id,actor,side,action,before_a,before_b,after_a,after_b,tie_version)
 values(t.id,p_game,p_request_id,p_actor,p_side,p_action,g.score_a,g.score_b,na,nb,t.version);
 return jsonb_build_object('tie_id',t.id,'game',p_game,'score_a',na,'score_b',nb,'version',t.version,'replayed',false);
end $$;
revoke all on function public.mbbl_apply_score_action(uuid,integer,text,text,uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.mbbl_apply_score_action(uuid,integer,text,text,uuid,uuid,bigint) to service_role;
