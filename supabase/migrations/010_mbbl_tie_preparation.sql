-- Controlled MBBL league tie preparation. Never automatically starts a match.
create or replace function public.mbbl_allowed_category_pair(p_game integer,p_cat text[])
returns boolean language plpgsql immutable set search_path='' as $$
declare a text;b text;
begin
 if array_length(p_cat,1)<>2 or p_cat[1] is null or p_cat[2] is null or p_cat[1]=p_cat[2] then return false;end if;
 a:=p_cat[1];b:=p_cat[2];
 case p_game
 when 1 then return (a='A+' or b='A+') and left(a,1)='A' and left(b,1)='A';
 when 2 then return a<>'A+' and b<>'A+' and left(a,1)='A' and left(b,1)='A';
 when 3 then return (a='B1' or b='B1') and left(a,1)='B' and left(b,1)='B';
 when 4 then return a<>'B1' and b<>'B1' and left(a,1)='B' and left(b,1)='B';
 when 5 then return (a='C1' or b='C1') and left(a,1)='C' and left(b,1)='C';
 when 6 then return a<>'C1' and b<>'C1' and left(a,1)='C' and left(b,1)='C';
 when 7 then return (a='K1' or b='K1') and
    ((a='K1' and (b='K2' or left(b,1)='W')) or
     (b='K1' and (a='K2' or left(a,1)='W')));
 when 8 then return a<>'K1' and b<>'K1' and
   left(a,1) in ('K','W') and left(b,1) in ('K','W');
 when 9 then return (a='G1' and left(b,1)='B') or (b='G1' and left(a,1)='B');
 else return false;
 end case;
end $$;
revoke all on function public.mbbl_allowed_category_pair(integer,text[]) from public,anon,authenticated;
grant execute on function public.mbbl_allowed_category_pair(integer,text[]) to service_role;

create or replace function public.mbbl_prepare_league_tie(
 p_fixture_id uuid,p_pairs jsonb,p_trumps_a integer[],p_trumps_b integer[],p_actor uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare
 f public.event_fixture_slots%rowtype;
 created_id uuid;
 g jsonb;
 n int;
 a text[];b text[];
 used_a text[]:=array[]::text[];
 used_b text[]:=array[]::text[];
 tr_a_count integer;
 tr_b_count integer;
begin
 if p_actor is null or not exists(select 1 from public.profiles where id=p_actor and role='owner')
 then raise exception 'Only owner can prepare a team tie';end if;
 select * into f from public.event_fixture_slots
 where id=p_fixture_id and published=true and stage='league' and status='scheduled'
 for update;
 if not found or f.team_a_id is null or f.team_b_id is null then raise exception 'Published league fixture required';end if;
 if not exists(select 1 from public.tournament_rules where tournament_id=f.tournament_id and format_key='mbbl-s1')
 then raise exception 'Fixture is not an MBBL event';end if;
 if p_pairs is null or jsonb_typeof(p_pairs)<>'array' or jsonb_array_length(p_pairs)<>9
 then raise exception 'Nine category pair selections required';end if;
 if array_length(p_trumps_a,1)<>3 or array_length(p_trumps_b,1)<>3
 then raise exception 'Each team must select exactly three Trump games';end if;
 select count(distinct x) into tr_a_count from unnest(p_trumps_a) x where x between 1 and 9;
 select count(distinct x) into tr_b_count from unnest(p_trumps_b) x where x between 1 and 9;
 if tr_a_count<>3 or tr_b_count<>3 then raise exception 'Trump selections must be three unique games 1–9';end if;
 if exists(select 1 from public.mbbl_ties where fixture_slot_id=f.id) then
  raise exception 'This fixture has already been prepared';end if;
 -- Insertion and category validation in one database transaction.
 insert into public.mbbl_ties(fixture_slot_id,tournament_id,court_id,team_a_id,team_b_id,status)
 values(f.id,f.tournament_id,f.court_id,f.team_a_id,f.team_b_id,'ready')
 returning id into created_id;
 for n in 1..9 loop
  select x.value into g from jsonb_array_elements(p_pairs) x where
   x.value->>'game'=n::text;
  if not found then raise exception 'Missing game %',n;end if;
  a:=array(select jsonb_array_elements_text(g->'a'));
  b:=array(select jsonb_array_elements_text(g->'b'));
  if not public.mbbl_allowed_category_pair(n,a) or not public.mbbl_allowed_category_pair(n,b)
  then raise exception 'Invalid category pair in game %',n;end if;
  if a&&used_a or b&&used_b then raise exception 'Each player category can appear once per tie';end if;
  if (select count(*) from public.players where team_id=f.team_a_id and category=any(a))<>2 or
     (select count(*) from public.players where team_id=f.team_b_id and category=any(b))<>2
  then raise exception 'Selected category not registered to corresponding team';end if;
  used_a:=used_a||a;used_b:=used_b||b;
  insert into public.mbbl_tie_games(tie_id,game_number,category_a,category_b,trump_a,trump_b)
   values(created_id,n,a,b,n=any(p_trumps_a),n=any(p_trumps_b));
 end loop;
 if array_length(used_a,1)<>18 or array_length(used_b,1)<>18
 then raise exception 'Every registered category must play once';end if;
 return created_id;
end $$;
revoke all on function public.mbbl_prepare_league_tie(uuid,jsonb,integer[],integer[],uuid) from public,anon,authenticated;
grant execute on function public.mbbl_prepare_league_tie(uuid,jsonb,integer[],integer[],uuid) to service_role;

-- Tighten authenticated point changes to the only currently supported
-- explicit end condition. No 14-all decision has been made yet, so this
-- guard is inert until official confirmation. Even after confirmation the
-- owner must explicitly start each game.
create or replace function public.mbbl_guard_score_limit()
returns trigger language plpgsql security definer set search_path='' as $$
declare configured text;
begin
 if (new.score_a,new.score_b) is distinct from (old.score_a,old.score_b) then
  select tr.format_metadata->>'rally_14_all_resolution' into configured
  from public.mbbl_ties t join public.tournament_rules tr on tr.tournament_id=t.tournament_id
  where t.id=new.tie_id;
  if configured is distinct from 'first-to-15' then
   raise exception 'Unconfirmed scoring cap; cannot modify score';end if;
  if new.score_a>15 or new.score_b>15 then raise exception 'MBBL scoring cap 15 exceeded';end if;
 end if;
 return new;
end $$;
drop trigger if exists trg_mbbl_guard_score_limit on public.mbbl_tie_games;
create trigger trg_mbbl_guard_score_limit before update of score_a,score_b on public.mbbl_tie_games
 for each row execute function public.mbbl_guard_score_limit();
