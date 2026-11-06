-- Applied to tournament production on 2026-11-06 as an additive migration.
-- Owner name labels are event-poster facts, NOT application authorization grants.
alter table public.teams add column if not exists owner_names text[] not null default '{}'::text[];
alter table public.teams add column if not exists announcement_source text;
comment on column public.teams.owner_names is 'Public team owners per announcement posters, not app permissions or login identities';
comment on column public.teams.announcement_source is 'Poster provenance name; original image is not hosted in this column';
