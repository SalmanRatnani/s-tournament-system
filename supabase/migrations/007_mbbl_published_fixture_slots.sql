-- MBBL Season 1 published timetable. Deliberately NOT scoreable matches.
-- Date unspecified in organiser poster; start/end are local Asia/Kolkata wall-clock times.
-- Public can read only explicitly published slots; only privileged DB/service can write.
create table if not exists public.event_fixture_slots (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournaments(id) on delete cascade,
 stage text not null check(stage in ('league','semifinal','final')),
 round_no integer,
 court_id integer references public.courts(id),
 start_local time without time zone not null,
 end_local time without time zone not null,
 time_zone text not null default 'Asia/Kolkata',
 team_a_id uuid references public.teams(id),
 team_b_id uuid references public.teams(id),
 seed_a text,
 seed_b text,
 published boolean not null default false,
 status text not null default 'scheduled' check(status in ('scheduled','delayed','cancelled')),
 updated_at timestamptz not null default now(),
 constraint event_fixture_slots_order_check check(start_local < end_local),
 constraint event_fixture_slots_team_distinct check(team_a_id is null or team_b_id is null or team_a_id <> team_b_id),
 constraint event_fixture_slots_stage_constraints check (
  (stage='league' and round_no between 1 and 5 and court_id between 1 and 3 and team_a_id is not null and team_b_id is not null and seed_a is null and seed_b is null)
  or (stage in ('semifinal','final') and round_no is null and team_a_id is null and team_b_id is null and seed_a is not null and seed_b is not null)
 )
);
create unique index if not exists event_fixture_slots_round_court_unique on public.event_fixture_slots(tournament_id,stage,round_no,court_id) where stage='league';
create unique index if not exists event_fixture_slots_stage_seed_unique on public.event_fixture_slots(tournament_id,stage,seed_a,seed_b) where stage<>'league';
create index if not exists event_fixture_slots_tournament_time_idx on public.event_fixture_slots(tournament_id,start_local,court_id);
alter table public.event_fixture_slots enable row level security;
drop policy if exists "Published fixtures can be read" on public.event_fixture_slots;
create policy "Published fixtures can be read" on public.event_fixture_slots for select to anon,authenticated using (published=true);
revoke all on table public.event_fixture_slots from public,anon,authenticated;
grant select on table public.event_fixture_slots to anon,authenticated;
comment on table public.event_fixture_slots is 'Published time slots separate from matches; cannot be scored or alter league standings.';
