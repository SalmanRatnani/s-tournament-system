-- Integration rehearsal against installed MBBL functions. ALL data rolls back.
-- Uses a scheduled fixture and the existing owner only inside this transaction.
begin;
set local role service_role;
do $$
declare
 f public.event_fixture_slots%rowtype;
 actor uuid;
 tie uuid;
 v bigint:=0;
 r jsonb;
 request uuid;
 before_count bigint;
 snapshot jsonb;
 i integer;
 pairs jsonb:='[{"game":1,"a":["A+","A1"],"b":["A+","A1"]},{"game":2,"a":["A2","A3"],"b":["A2","A3"]},{"game":3,"a":["B1","B2"],"b":["B1","B2"]},{"game":4,"a":["B3","B4"],"b":["B3","B4"]},{"game":5,"a":["C1","C2"],"b":["C1","C2"]},{"game":6,"a":["C3","C4"],"b":["C3","C4"]},{"game":7,"a":["K1","K2"],"b":["K1","K2"]},{"game":8,"a":["W1","W2"],"b":["W1","W2"]},{"game":9,"a":["G1","B5"],"b":["G1","B5"]}]';
begin
 select id into strict actor from public.profiles where role='owner' limit 1;
 select * into strict f from public.event_fixture_slots slot where stage='league' and published and status='scheduled'
  and not exists(select 1 from public.mbbl_ties t where t.fixture_slot_id=slot.id)
  and not exists(select 1 from public.mbbl_ties t where t.court_id=slot.court_id and t.status in ('live','paused','awaiting_relay'))
  order by round_no,court_id limit 1;
 tie:=public.mbbl_prepare_league_tie(f.id,pairs,array[1,2,3],array[1,2,3],actor);
 if exists(select 1 from jsonb_array_elements(public.mbbl_public_score_snapshot(f.court_id)->'mbblTies') t where t->>'id'=tie::text)
 then raise exception 'TEST: ready tie leaked publicly';end if;
 r:=public.mbbl_control_game(tie,actor,'start',v);v:=(r->>'version')::bigint;
 for i in 1..14 loop
  r:=public.mbbl_apply_score_action(tie,1,'a','point',gen_random_uuid(),actor,v);v:=(r->>'version')::bigint;
  r:=public.mbbl_apply_score_action(tie,1,'b','point',gen_random_uuid(),actor,v);v:=(r->>'version')::bigint;
 end loop;
 request:=gen_random_uuid();
 r:=public.mbbl_apply_score_action(tie,1,'a','point',request,actor,v);v:=(r->>'version')::bigint;
 if (r->>'score_a')::int<>15 or (r->>'score_b')::int<>14 then raise exception 'TEST: 15-14 not accepted';end if;
 select count(*) into before_count from public.mbbl_score_events where tie_id=tie;
 r:=public.mbbl_apply_score_action(tie,1,'a','point',request,actor,v-1);
 if not (r->>'replayed')::boolean or (r->>'version')::bigint<>v or (select count(*) from public.mbbl_score_events where tie_id=tie)<>before_count
 then raise exception 'TEST: retry duplicated a point';end if;
 begin
  perform public.mbbl_control_game(tie,actor,'finish',v);
  raise exception 'TEST: golden point accepted';
 exception when others then if sqlerrm not like 'Reach 15 and lead by two%' then raise;end if;end;
 begin
  perform public.mbbl_apply_score_action(tie,1,'b','point',gen_random_uuid(),actor,v-1);
  raise exception 'TEST: stale write accepted';
 exception when others then if sqlerrm<>'Stale tie version' then raise;end if;end;
 begin
  perform public.mbbl_apply_score_action(tie,1,'b','point',gen_random_uuid(),gen_random_uuid(),v);
  raise exception 'TEST: unassigned actor accepted';
 exception when others then if sqlerrm<>'Referee not assigned to this tie' then raise;end if;end;
 r:=public.mbbl_control_game(tie,actor,'pause',v);v:=(r->>'version')::bigint;
 begin
  perform public.mbbl_apply_score_action(tie,1,'b','point',gen_random_uuid(),actor,v);
  raise exception 'TEST: scoring allowed while paused';
 exception when others then if sqlerrm<>'Tie is not live on this game' then raise;end if;end;
 r:=public.mbbl_control_game(tie,actor,'start',v);v:=(r->>'version')::bigint;
 r:=public.mbbl_apply_score_action(tie,1,'a','point',gen_random_uuid(),actor,v);v:=(r->>'version')::bigint;
 begin
  perform public.mbbl_apply_score_action(tie,1,'b','point',gen_random_uuid(),actor,v);
  raise exception 'TEST: play continued after winning rally';
 exception when others then if sqlerrm not like 'Game already won%' then raise;end if;end;
 r:=public.mbbl_apply_score_action(tie,1,'a','undo',gen_random_uuid(),actor,v);v:=(r->>'version')::bigint;
 r:=public.mbbl_apply_score_action(tie,1,'a','undo',gen_random_uuid(),actor,v);v:=(r->>'version')::bigint;
 if (r->>'score_a')::int<>14 or (r->>'score_b')::int<>14 then raise exception 'TEST: consecutive undo failed';end if;
 for i in 15..30 loop
  r:=public.mbbl_apply_score_action(tie,1,'a','point',gen_random_uuid(),actor,v);v:=(r->>'version')::bigint;
  r:=public.mbbl_apply_score_action(tie,1,'b','point',gen_random_uuid(),actor,v);v:=(r->>'version')::bigint;
 end loop;
 r:=public.mbbl_apply_score_action(tie,1,'a','point',gen_random_uuid(),actor,v);v:=(r->>'version')::bigint;
 begin
  perform public.mbbl_control_game(tie,actor,'finish',v);
  raise exception 'TEST: sudden-death cap beyond 30';
 exception when others then if sqlerrm not like 'Reach 15 and lead by two%' then raise;end if;end;
 r:=public.mbbl_apply_score_action(tie,1,'a','point',gen_random_uuid(),actor,v);v:=(r->>'version')::bigint;
 if (r->>'score_a')::int<>32 or (r->>'score_b')::int<>30 then raise exception 'TEST: extended deuce failed';end if;
 select t into snapshot from jsonb_array_elements(public.mbbl_public_score_snapshot(f.court_id)->'mbblTies') t where t->>'id'=tie::text;
 if snapshot is null or (snapshot->>'score_a')::int<>32 or (snapshot->>'version')::bigint<>v or jsonb_array_length(snapshot->'games')<>1
  or (snapshot#>>'{games,0,score_a}')::int<>32
 then raise exception 'TEST: inconsistent or private public projection';end if;
 r:=public.mbbl_control_game(tie,actor,'finish',v);v:=(r->>'version')::bigint;
 if (r->>'active_game')::int<>2 or (r->>'overall_a')::int<>2 or (r->>'overall_b')::int<>-1 or r->>'status'<>'paused'
 then raise exception 'TEST: Trump totals or next-game control failed';end if;
 if has_function_privilege('anon','public.mbbl_apply_score_action(uuid,integer,text,text,uuid,uuid,bigint)','EXECUTE')
 or has_function_privilege('authenticated','public.mbbl_apply_score_action(uuid,integer,text,text,uuid,uuid,bigint)','EXECUTE')
 or has_function_privilege('anon','public.mbbl_public_score_snapshot(integer)','EXECUTE')
 then raise exception 'TEST: privileged RPC exposed';end if;
end $$;
rollback;
select 'PASS: deuce, replay, stale/assignment checks, pause/resume, undo, cap-free scoring, projection and Trump finalisation; all test data rolled back' as result;
