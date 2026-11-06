-- Non-destructive MBBL Season 1 format registration.
-- Distinguish existing generic five-rubber competitions from nine-game events.
-- No fixture or scoring tables are rewritten. Only owners may manage an MBBL event.
alter table public.tournament_rules drop constraint if exists tournament_rules_rubbers_per_tie_check;
alter table public.tournament_rules add constraint tournament_rules_rubbers_per_tie_check check (rubbers_per_tie in (5,9));
alter table public.tournament_rules add column if not exists format_key text not null default 'generic-badminton';
alter table public.tournament_rules add column if not exists format_metadata jsonb not null default '{}'::jsonb;
alter table public.tournament_rules drop constraint if exists tournament_rules_format_key_check;
alter table public.tournament_rules add constraint tournament_rules_format_key_check check (format_key in ('generic-badminton','mbbl-s1'));
comment on column public.tournament_rules.format_metadata is 'Source-specific rule details. Not authorization. MBBL game to 15 end-condition must be officially confirmed before live scoring.';
