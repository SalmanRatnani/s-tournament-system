-- Owner-only controlled MBBL game lifecycle. Does NOT activate play unless
-- the official organiser-approved scoring rule is explicitly stored.
create or replace function public.mbbl_control_game(
 p_tie_id uuid,p_actor uuid,p_action text,p_expected_version bigint
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 t public.mbbl_ties%rowtype;
 g public.mbbl_tie_games%rowtype;
 decision text;
 delta_a int:=0;delta_b int:=0;
 new_a int;new_b int;
 next_status text;
begin
 if p_tie_id is null or p_actor is null or p_action not in ('start','pause','finish') or p_expected_version is null then
  raise exception 'Invalid match control command';end if;
 if not exists(select 1 from public.profiles where id=p_actor and role='owner')
 then raise exception 'Main Controller access required';end if;
 select * into t from public.mbbl_ties where id=p_tie_id for update;
 if not found then raise exception 'Official MBBL tie not found';end if;
 if t.version<>p_expected_version then raise exception 'Stale tie version';end if;
 select tr.format_metadata->>'rally_14_all_resolution' into decision
 from public.tournament_rules tr where tr.tournament_id=t.tournament_id and tr.format_key='mbbl-s1';
 if decision is distinct from 'first-to-15' then
  raise exception 'Official 14-all game-ending rule must be confirmed before control can start';end if;
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
  if greatest(g.score_a,g.score_b)<>15 or g.score_a=g.score_b
  then raise exception 'First team to 15 required to complete the game';end if;
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
