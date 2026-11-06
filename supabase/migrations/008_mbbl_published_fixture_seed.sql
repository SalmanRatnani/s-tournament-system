-- MBBL Season 1 event schedule, transcribed from organiser's official poster.
-- Run after 007_mbbl_published_fixture_slots.sql and MBBL roster imports.
-- Date intentionally unset: poster provides local IST times but no calendar date.
do $fixture_seed$
declare
 event_id uuid;
 inserted_count integer;
begin
 perform pg_advisory_xact_lock(hashtext('mbbl-official-fixture-import'));
 select tr.tournament_id into event_id
 from public.tournament_rules tr
 where tr.format_key='mbbl-s1'
 order by tr.tournament_id limit 1;
 if event_id is null then raise exception 'MBBL tournament not found'; end if;
 if (select count(*) from public.tournament_rules where format_key='mbbl-s1')<>1 then
   raise exception 'Expected exactly one MBBL event';
 end if;
 if (select count(*) from public.teams where tournament_id=event_id)<>6 then
   raise exception 'Requires exactly six imported MBBL teams';
 end if;
 if exists(select 1 from public.event_fixture_slots where tournament_id=event_id) then
   raise exception 'Fixture schedule already exists: refusing to duplicate or replace published fixtures';
 end if;
 with announced(round_no,court_id,start_local,end_local,home_slug,away_slug) as (
  values
  (1,1,'08:30'::time,'10:00'::time,'tsar-strikers','mb-baddy-group'),
  (1,2,'08:30'::time,'10:00'::time,'supreme-aces','bad-minions'),
  (1,3,'08:30'::time,'10:00'::time,'shuttle-psychos','asha-smashers'),
  (2,1,'10:00'::time,'11:30'::time,'tsar-strikers','supreme-aces'),
  (2,2,'10:00'::time,'11:30'::time,'mb-baddy-group','shuttle-psychos'),
  (2,3,'10:00'::time,'11:30'::time,'bad-minions','asha-smashers'),
  (3,1,'11:30'::time,'13:00'::time,'tsar-strikers','bad-minions'),
  (3,2,'11:30'::time,'13:00'::time,'mb-baddy-group','asha-smashers'),
  (3,3,'11:30'::time,'13:00'::time,'supreme-aces','shuttle-psychos'),
  (4,1,'13:30'::time,'15:00'::time,'tsar-strikers','shuttle-psychos'),
  (4,2,'13:30'::time,'15:00'::time,'mb-baddy-group','bad-minions'),
  (4,3,'13:30'::time,'15:00'::time,'supreme-aces','asha-smashers'),
  (5,1,'15:00'::time,'16:30'::time,'tsar-strikers','asha-smashers'),
  (5,2,'15:00'::time,'16:30'::time,'mb-baddy-group','supreme-aces'),
  (5,3,'15:00'::time,'16:30'::time,'bad-minions','shuttle-psychos')
 ),
 submitted as (
 insert into public.event_fixture_slots
 (tournament_id,stage,round_no,court_id,start_local,end_local,time_zone,team_a_id,team_b_id,published)
 select event_id,'league',a.round_no,a.court_id,a.start_local,a.end_local,'Asia/Kolkata',home.id,away.id,true
 from announced a
 join public.teams home on home.tournament_id=event_id and home.auction_metadata->>'slug'=a.home_slug
 join public.teams away on away.tournament_id=event_id and away.auction_metadata->>'slug'=a.away_slug
 returning id
 )
 select count(*) into inserted_count from submitted;
 if inserted_count<>15 then raise exception 'Expected 15 round-robin fixtures but imported %',inserted_count; end if;
 insert into public.event_fixture_slots(tournament_id,stage,court_id,start_local,end_local,seed_a,seed_b,published)
 values
 (event_id,'semifinal',1,'16:30'::time,'18:00'::time,'LEAGUE RANK 1','LEAGUE RANK 4',true),
 (event_id,'semifinal',2,'16:30'::time,'18:00'::time,'LEAGUE RANK 2','LEAGUE RANK 3',true),
 (event_id,'final',null,'18:00'::time,'19:30'::time,'WINNER SF1','WINNER SF2',true);
 if (select count(*) from public.event_fixture_slots where tournament_id=event_id)<>18 then
  raise exception 'Incorrect number of published slots';
 end if;
 if (select count(*) from public.matches where tournament_id=event_id)<>0 then
  raise exception 'Unexpected live match records; aborting fixture publication';
 end if;
end
$fixture_seed$;
