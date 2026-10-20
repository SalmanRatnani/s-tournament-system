-- APPLY AFTER 001_initial.sql, IN A SEPARATE TOURNAMENT SUPABASE PROJECT.
-- Never seed the owner password in SQL or a repository.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles alter column role set default 'viewer';
alter table public.profiles add constraint profiles_role_check check(role in ('owner','admin','referee','viewer'));

-- Every new authenticated account starts as an unprivileged viewer, even if
-- user_metadata tries to request owner/admin privileges.
create or replace function public.create_signup_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name,role) values(new.id,coalesce(nullif(left(new.raw_user_meta_data->>'display_name',80),''),split_part(new.email,'@',1)),'viewer') on conflict (id) do nothing;
 return new;
end $$;
drop trigger if exists on_tournament_auth_user_created on auth.users;
create trigger on_tournament_auth_user_created after insert on auth.users for each row execute procedure public.create_signup_profile();
-- One-time legacy backfill if Auth accounts existed before migration.
insert into public.profiles(id,display_name,role)
select id,split_part(email,'@',1),'viewer' from auth.users on conflict(id) do nothing;

alter table public.matches add column if not exists team_a_id uuid references public.teams(id);
alter table public.matches add column if not exists team_b_id uuid references public.teams(id);
create unique index if not exists one_league_tie_per_pair on public.matches(tournament_id,least(team_a_id,team_b_id),greatest(team_a_id,team_b_id)) where round like 'LEAGUE %' and kind='team_tie';
create unique index if not exists one_playoff_tie_per_round on public.matches(tournament_id,round) where round in ('SEMIFINAL 1','SEMIFINAL 2','FINAL');
create unique index if not exists player_per_team_name on public.players(team_id,lower(name));

create table public.tournament_rules (
 tournament_id uuid primary key references public.tournaments(id) on delete cascade,
 team_count int not null default 6 check(team_count=6),
 roster_size int not null default 18 check(roster_size=18),
 rubbers_per_tie int not null default 5 check(rubbers_per_tie=5),
 stage text not null default 'registration' check(stage in ('registration','league','knockouts','finished')),
 created_at timestamptz not null default now()
);
alter table public.tournament_rules enable row level security;
create policy rules_read on public.tournament_rules for select to anon,authenticated using(true);

-- Team and roster caps enforced even for concurrent admin requests.
create or replace function public.limit_roster_and_teams() returns trigger language plpgsql set search_path='' as $$
declare t uuid;max_size int;
begin
 if TG_TABLE_NAME='teams' then
  if new.tournament_id is null then raise exception 'Tournament is required';end if;
  perform 1 from public.tournaments where id=new.tournament_id for update;
  if (select count(*) from public.teams where tournament_id=new.tournament_id and id is distinct from new.id)>=6 then
   raise exception 'Tournament already has six teams';end if;
 else
  if new.team_id is null then raise exception 'Team is required';end if;
  perform 1 from public.teams where id=new.team_id for update;
  if (select count(*) from public.players where team_id=new.team_id and id is distinct from new.id)>=18 then
   raise exception 'A team cannot contain more than eighteen players';end if;
 end if;
 return new;
end $$;
create trigger limit_tournament_teams before insert or update of tournament_id on public.teams for each row execute function public.limit_roster_and_teams();
create trigger limit_team_players before insert or update of team_id on public.players for each row execute function public.limit_roster_and_teams();

-- Parent tie scores reflect completed rubber results. Point corrections recalculate them.
create or replace function public.sync_parent_tie() returns trigger language plpgsql set search_path='' as $$
declare aw int;bw int;parent public.matches%rowtype;
begin
 if new.tie_id is null or new.kind='team_tie' then return new;end if;
 select * into parent from public.matches where id=new.tie_id for update;
 if not found then return new;end if;
 select count(*) filter(where winner='a' and status='completed'),
        count(*) filter(where winner='b' and status='completed') into aw,bw
 from public.matches where tie_id=new.tie_id and kind<>'team_tie';
 update public.matches set score_a=aw,score_b=bw,
  status=case when greatest(aw,bw)>=3 then 'completed' when (aw+bw)>0 then 'live' else 'scheduled' end,
  winner=case when aw>=3 then 'a' when bw>=3 then 'b' else null end,
  version=version+1,updated_at=now() where id=new.tie_id;
 return new;
end $$;
create trigger sync_tie_after_rubber after update of status,winner on public.matches for each row when (new.tie_id is not null) execute function public.sync_parent_tie();

-- Generate 5 rounds x 3 team ties. Cannot regenerate after play starts.
create or replace function public.generate_six_team_league(p_tournament_id uuid)
returns int language plpgsql security invoker set search_path='' as $$
declare ids uuid[];a uuid;b uuid;ar uuid[];round_num int;slot int;ct int:=0;ca uuid;cb uuid;
begin
 perform pg_advisory_xact_lock(hashtext(p_tournament_id::text));
 select array_agg(id order by created_at,id) into ids from public.teams where tournament_id=p_tournament_id;
 if coalesce(array_length(ids,1),0)<>6 then raise exception 'Create six teams first';end if;
 if (select count(*) from public.players p join public.teams t on t.id=p.team_id where t.tournament_id=p_tournament_id)<>108 then raise exception 'Fill all 18 player slots per team first';end if;
 if exists(select 1 from public.matches where tournament_id=p_tournament_id) then raise exception 'Tournament already contains fixtures';end if;
 ar=ids;
 for round_num in 1..5 loop
  for slot in 1..3 loop
   a=ar[slot];b=ar[7-slot];
   if round_num%2=0 then ca=b;cb=a;else ca=a;cb=b;end if;
   insert into public.matches(tournament_id,court_id,round,kind,side_a,side_b,team_a_id,team_b_id,best_of,winning_score)
   values(p_tournament_id,slot,'LEAGUE '||round_num,'team_tie',
   (select name from public.teams where id=ca),(select name from public.teams where id=cb),ca,cb,1,1);
   ct=ct+1;
  end loop;
  ar=array[ar[1],ar[6],ar[2],ar[3],ar[4],ar[5]];
 end loop;
 insert into public.tournament_rules(tournament_id,stage) values(p_tournament_id,'league')
 on conflict(tournament_id) do update set stage='league';
 return ct;
end $$;

create or replace function public.generate_team_semifinals(p_tournament_id uuid)
returns int language plpgsql security invoker set search_path='' as $$
declare teams uuid[];names text[];i int;la int;ranked record;
begin
 perform pg_advisory_xact_lock(hashtext(p_tournament_id::text));
 select count(*) into la from public.matches where tournament_id=p_tournament_id and round like 'LEAGUE %' and kind='team_tie';
 if la<>15 or exists(select 1 from public.matches where tournament_id=p_tournament_id and round like 'LEAGUE %' and kind='team_tie' and (status<>'completed' or winner is null)) then raise exception 'Finish all fifteen league ties first';end if;
 if exists(select 1 from public.matches where tournament_id=p_tournament_id and round like 'SEMIFINAL %') then raise exception 'Semifinals are already generated';end if;
 -- rankings: 2 points per won tie; rubber difference, rubbers won; stable name tie-break.
 select array_agg(id order by pts desc,diff desc,rw desc,name) into teams from (
  select t.id,t.name,
   count(m.id) filter(where m.status='completed' and ((m.team_a_id=t.id and m.winner='a') or (m.team_b_id=t.id and m.winner='b')))*2 as pts,
   coalesce(sum(case when m.team_a_id=t.id then m.score_a-m.score_b when m.team_b_id=t.id then m.score_b-m.score_a else 0 end),0) as diff,
   coalesce(sum(case when m.team_a_id=t.id then m.score_a when m.team_b_id=t.id then m.score_b else 0 end),0) as rw
  from public.teams t left join public.matches m on m.tournament_id=t.tournament_id and m.round like 'LEAGUE %' and m.kind='team_tie' and (m.team_a_id=t.id or m.team_b_id=t.id)
  where t.tournament_id=p_tournament_id group by t.id,t.name
 ) z;
 if array_length(teams,1)<>6 then raise exception 'Invalid six-team table';end if;
 for i in 1..2 loop
  insert into public.matches(tournament_id,court_id,round,kind,side_a,side_b,team_a_id,team_b_id,best_of,winning_score)
  values(p_tournament_id,i,'SEMIFINAL '||i,'team_tie',
    (select name from public.teams where id=teams[i]),
    (select name from public.teams where id=teams[5-i]),teams[i],teams[5-i],1,1);
 end loop;
 update public.tournament_rules set stage='knockouts' where tournament_id=p_tournament_id;
 return 2;
end $$;

create or replace function public.generate_team_final(p_tournament_id uuid)
returns int language plpgsql security invoker set search_path='' as $$
declare semis public.matches[];a uuid;b uuid;
begin
 perform pg_advisory_xact_lock(hashtext(p_tournament_id::text));
 if exists(select 1 from public.matches where tournament_id=p_tournament_id and round='FINAL') then raise exception 'Final already generated';end if;
 if (select count(*) from public.matches where tournament_id=p_tournament_id and round like 'SEMIFINAL %' and status='completed' and winner is not null)<>2 then raise exception 'Complete both semifinals first';end if;
 select case when winner='a' then team_a_id else team_b_id end into a from public.matches where tournament_id=p_tournament_id and round='SEMIFINAL 1';
 select case when winner='a' then team_a_id else team_b_id end into b from public.matches where tournament_id=p_tournament_id and round='SEMIFINAL 2';
 insert into public.matches(tournament_id,court_id,round,kind,side_a,side_b,team_a_id,team_b_id,best_of,winning_score)
 values(p_tournament_id,1,'FINAL','team_tie',(select name from public.teams where id=a),(select name from public.teams where id=b),a,b,1,1);
 return 1;
end $$;

-- Teams, fixtures and registrations are never directly mutable using anon or authenticated keys.
revoke all on function public.generate_six_team_league(uuid) from public,anon,authenticated;
revoke all on function public.generate_team_semifinals(uuid) from public,anon,authenticated;
revoke all on function public.generate_team_final(uuid) from public,anon,authenticated;
grant execute on function public.generate_six_team_league(uuid) to service_role;
grant execute on function public.generate_team_semifinals(uuid) to service_role;
grant execute on function public.generate_team_final(uuid) to service_role;
create index if not exists matches_tie_lookup on public.matches(tie_id,status);
create index if not exists matches_team_stage_lookup on public.matches(tournament_id,round,team_a_id,team_b_id);
-- Team tie is a container for individual rubbers, not an occupied court slot.
drop index if exists public.one_active_match_per_court;
create unique index one_active_rubber_per_court on public.matches(court_id) where status in ('live','paused') and kind<>'team_tie';

-- One accountable lead referee controls each rubber. A referee may officiate different rubbers at different times.
create unique index if not exists one_referee_per_match on public.referee_assignments(match_id);
-- Only one platform owner; this role can be set through the private SQL editor.
create unique index if not exists one_platform_owner on public.profiles ((true)) where role='owner';
-- Prevent concurrent duplicate rubber numbering under one parent tie.
create unique index if not exists unique_rubber_round_per_tie on public.matches(tie_id,round) where tie_id is not null;
