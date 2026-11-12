-- Organiser decision 2026-11-11: MBBL games to 15, win by two, no golden point.
-- Does not start matches, alter completed results, or change the 30-point relay.
alter table public.mbbl_tie_games drop constraint mbbl_tie_games_score_a_check;
alter table public.mbbl_tie_games drop constraint mbbl_tie_games_score_b_check;
alter table public.mbbl_tie_games add constraint mbbl_tie_games_score_a_check check(score_a>=0);
alter table public.mbbl_tie_games add constraint mbbl_tie_games_score_b_check check(score_b>=0);

-- NULL explicitly means no cap for this format; generic badminton keeps a cap.
alter table public.tournament_rules alter column default_point_cap drop not null;
alter table public.tournament_rules add constraint tournament_rules_generic_cap_required
 check(format_key='mbbl-s1' or default_point_cap is not null);
update public.tournament_rules set default_best_of=1,default_winning_score=15,
 default_win_by_two=true,default_point_cap=null,
 format_metadata=format_metadata||jsonb_build_object('rally_14_all_resolution','win-by-two',
  'rally_point_cap',null,'rally_rule_confirmed_on','2026-11-11')
 where format_key='mbbl-s1';

create or replace function public.mbbl_game_winner(p_a integer,p_b integer)
returns text language sql immutable security invoker set search_path='' as $$
 select case when p_a>=0 and p_b>=0 and greatest(p_a,p_b)>=15 and abs(p_a-p_b)>=2
 then case when p_a>p_b then 'a' else 'b' end else null end;
$$;
revoke all on function public.mbbl_game_winner(integer,integer) from public,anon,authenticated;
grant execute on function public.mbbl_game_winner(integer,integer) to service_role;

-- Preserve an immutable, replay-safe undo trail, including consecutive undos.
alter table public.mbbl_score_events add column undoes_event_id bigint references public.mbbl_score_events(id);
create unique index mbbl_score_event_one_undo on public.mbbl_score_events(undoes_event_id) where undoes_event_id is not null;
create index mbbl_score_events_game_idx on public.mbbl_score_events(tie_id,game_number,id desc);
create index if not exists matches_updated_at_idx on public.matches(updated_at desc);

create or replace function public.mbbl_guard_score_limit()
returns trigger language plpgsql security invoker set search_path='' as $$
declare configured text;
begin
 if (new.score_a,new.score_b) is distinct from (old.score_a,old.score_b) then
  select tr.format_metadata->>'rally_14_all_resolution' into configured
  from public.mbbl_ties t join public.tournament_rules tr on tr.tournament_id=t.tournament_id
  where t.id=new.tie_id;
  if configured is distinct from 'win-by-two' then raise exception 'MBBL deuce rule not configured';end if;
  if (new.score_a>old.score_a or new.score_b>old.score_b) and public.mbbl_game_winner(old.score_a,old.score_b) is not null
  then raise exception 'Game already won; confirm final or undo the last point';end if;
 end if;
 return new;
end $$;
revoke all on function public.mbbl_guard_score_limit() from public,anon,authenticated;
grant execute on function public.mbbl_guard_score_limit() to service_role;

create or replace function public.mbbl_apply_score_action(
 p_tie_id uuid,p_game integer,p_side text,p_action text,p_request_id uuid,p_actor uuid,p_expected_version bigint
) returns jsonb language plpgsql security invoker
set search_path='' as $$
declare
 t public.mbbl_ties%rowtype;
 g public.mbbl_tie_games%rowtype;
 rule jsonb;
 previous public.mbbl_score_events%rowtype;
 na int;nb int;undo_id bigint;
begin
 if p_tie_id is null or p_actor is null or p_request_id is null or p_expected_version is null
   or p_side is null or p_action is null or p_game is null
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
 if rule->>'rally_14_all_resolution' is distinct from 'win-by-two'
 then raise exception 'MBBL deuce rule not configured';end if;
 select * into g from public.mbbl_tie_games where tie_id=t.id and game_number=p_game for update;
 if not found or g.status<>'live' then raise exception 'Game not live';end if;
 na:=g.score_a;nb:=g.score_b;
 if p_action='point' then
   if public.mbbl_game_winner(na,nb) is not null then raise exception 'Game already won; confirm final or undo the last point';end if;
   if p_side='a' then na:=na+1;else nb:=nb+1;end if;
 else
   -- Only the most recent point may be reversed, with full attribution.
   select * into previous from public.mbbl_score_events
    where tie_id=t.id and game_number=p_game and action='point'
     and not exists(select 1 from public.mbbl_score_events u where u.undoes_event_id=mbbl_score_events.id)
    order by id desc limit 1;
   if not found or previous.side<>p_side or previous.after_a<>na or previous.after_b<>nb
   then raise exception 'Nothing to undo on this side';end if;
   undo_id:=previous.id;
   if p_side='a' then na:=na-1;else nb:=nb-1;end if;
 end if;
 -- Validated finalisation of games belongs to a separate owner control action.
 -- This command cannot complete ties, select trumps or change lineups.
 update public.mbbl_tie_games set score_a=na,score_b=nb where tie_id=t.id and game_number=p_game;
 update public.mbbl_ties set score_a=na,score_b=nb,version=version+1,updated_at=now()
 where id=t.id returning * into t;
 insert into public.mbbl_score_events(tie_id,game_number,request_id,actor,side,action,before_a,before_b,after_a,after_b,tie_version,undoes_event_id)
 values(t.id,p_game,p_request_id,p_actor,p_side,p_action,g.score_a,g.score_b,na,nb,t.version,undo_id);
 return jsonb_build_object('tie_id',t.id,'game',p_game,'score_a',na,'score_b',nb,'version',t.version,'replayed',false);
end $$;
revoke all on function public.mbbl_apply_score_action(uuid,integer,text,text,uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.mbbl_apply_score_action(uuid,integer,text,text,uuid,uuid,bigint) to service_role;

create or replace function public.mbbl_control_game(
 p_tie_id uuid,p_actor uuid,p_action text,p_expected_version bigint
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 t public.mbbl_ties%rowtype;
 g public.mbbl_tie_games%rowtype;
 decision text;
 delta_a int:=0;delta_b int:=0;
 new_a int;new_b int;
 next_status text;
begin
 if p_tie_id is null or p_actor is null or p_action is null or p_action not in ('start','pause','finish') or p_expected_version is null then
  raise exception 'Invalid match control command';end if;
 if not exists(select 1 from public.profiles where id=p_actor and role='owner')
 then raise exception 'Main Controller access required';end if;
 select * into t from public.mbbl_ties where id=p_tie_id for update;
 if not found then raise exception 'Official MBBL tie not found';end if;
 if t.version<>p_expected_version then raise exception 'Stale tie version';end if;
 select tr.format_metadata->>'rally_14_all_resolution' into decision
 from public.tournament_rules tr where tr.tournament_id=t.tournament_id and tr.format_key='mbbl-s1';
 if decision is distinct from 'win-by-two' then
  raise exception 'MBBL deuce rule not configured';end if;
 select * into g from public.mbbl_tie_games where tie_id=t.id and game_number=t.active_game for update;
 if not found then raise exception 'Active game missing';end if;
 if p_action='start' then
  if t.status not in ('ready','paused') or g.status not in ('pending','live')
  then raise exception 'Game not ready to start';end if;
  update public.mbbl_tie_games set status='live',started_at=coalesce(started_at,now())
  where tie_id=t.id and game_number=t.active_game;
  update public.mbbl_ties set status='live',version=version+1,updated_at=now()
  where id=t.id returning * into t;
 elsif p_action='pause' then
  if t.status<>'live' then raise exception 'Only a live game can be paused';end if;
  update public.mbbl_ties set status='paused',version=version+1,updated_at=now()
  where id=t.id returning * into t;
 elsif p_action='finish' then
  if t.status<>'live' or g.status<>'live'
  then raise exception 'Only a live game can be completed';end if;
  if public.mbbl_game_winner(g.score_a,g.score_b) is null
  then raise exception 'Reach 15 and lead by two to complete the game';end if;
  if g.score_a>g.score_b then
   delta_a:=case when g.trump_a then 2 else 1 end;
   delta_b:=case when g.trump_b then -1 else 0 end;
  else
   delta_b:=case when g.trump_b then 2 else 1 end;
   delta_a:=case when g.trump_a then -1 else 0 end;
  end if;
  update public.mbbl_tie_games set status='completed',
   winner=case when g.score_a>g.score_b then 'a' else 'b' end,
   finished_at=now() where tie_id=t.id and game_number=t.active_game;
  new_a:=t.overall_a+delta_a;new_b:=t.overall_b+delta_b;
  if t.active_game=9 then
   next_status:=case when new_a=new_b and exists(
     select 1 from public.event_fixture_slots f where f.id=t.fixture_slot_id and f.stage<>'league'
    ) then 'awaiting_relay' else 'completed' end;
   update public.mbbl_ties set status=next_status,overall_a=new_a,overall_b=new_b,
    version=version+1,updated_at=now() where id=t.id returning * into t;
  else
   update public.mbbl_ties set status='paused',active_game=active_game+1,
    score_a=0,score_b=0,overall_a=new_a,overall_b=new_b,
    version=version+1,updated_at=now()
    where id=t.id returning * into t;
  end if;
 end if;
 return jsonb_build_object('tie_id',t.id,'status',t.status,'active_game',t.active_game,
  'score_a',t.score_a,'score_b',t.score_b,'overall_a',t.overall_a,'overall_b',t.overall_b,'version',t.version);
end $$;
revoke all on function public.mbbl_control_game(uuid,uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.mbbl_control_game(uuid,uuid,text,bigint) to service_role;

-- The server already uses service_role; these functions need no privilege elevation.
alter function public.mbbl_prepare_league_tie(uuid,jsonb,integer[],integer[],uuid) security invoker;
alter function public.mbbl_allowed_category_pair(integer,text[]) security invoker;

-- One bounded, internally consistent projection. No pending games, hidden Trump
-- choices, referee identities, audit events, credentials, or player roster payload.
create or replace function public.mbbl_public_score_snapshot(p_court integer default null)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
  'generatedAt',statement_timestamp(),
  'matches',coalesce((select jsonb_agg(to_jsonb(m)) from (
    select id,court_id,tournament_id,round,kind,side_a,side_b,status,score_a,score_b,
     games,current_game,best_of,winning_score,win_by_two,point_cap,winner,version,
     updated_at,team_a_id,team_b_id
    from public.matches where p_court is null or court_id=p_court
    order by updated_at desc limit 300
  ) m),'[]'::jsonb),
  'mbblTies',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('games',
    coalesce((select jsonb_agg(to_jsonb(g) order by g.game_number) from (
     select tie_id,game_number,score_a,score_b,status,category_a,category_b,trump_a,trump_b
     from public.mbbl_tie_games where tie_id=t.id and status<>'pending'
    ) g),'[]'::jsonb))) from (
   select t.id,t.fixture_slot_id,t.tournament_id,t.court_id,t.team_a_id,t.team_b_id,
    t.status,t.active_game,t.score_a,t.score_b,t.overall_a,t.overall_b,t.version,t.updated_at
   from public.mbbl_ties t join public.event_fixture_slots f on f.id=t.fixture_slot_id
   where f.published=true and t.status in ('live','paused','awaiting_relay','completed')
    and (p_court is null or t.court_id=p_court)
   order by t.updated_at desc limit 100
  ) t),'[]'::jsonb)
 );
$$;
revoke all on function public.mbbl_public_score_snapshot(integer) from public,anon,authenticated;
grant execute on function public.mbbl_public_score_snapshot(integer) to service_role;
