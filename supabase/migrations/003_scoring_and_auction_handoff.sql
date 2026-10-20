-- Run only in the NEW s-tournament-system Supabase project, AFTER 001 and 002.
-- Does not touch the auction database or its registrations.

alter table public.tournament_rules add column if not exists default_best_of int not null default 3 check(default_best_of in (1,3));
alter table public.tournament_rules add column if not exists default_winning_score int not null default 21 check(default_winning_score between 11 and 30);
alter table public.tournament_rules add column if not exists default_win_by_two boolean not null default true;
alter table public.tournament_rules add column if not exists default_point_cap int not null default 30 check(default_point_cap between 11 and 30);
alter table public.tournament_rules add constraint tournament_rules_valid_cap check(default_point_cap >= default_winning_score);

alter table public.teams add column if not exists source_auction_team_id text;
alter table public.teams add column if not exists captain_name text;
alter table public.teams add column if not exists logo_url text;
alter table public.teams add column if not exists logo_filename text;
alter table public.teams add column if not exists auction_metadata jsonb not null default '{}'::jsonb;
alter table public.players add column if not exists source_auction_player_id text;
alter table public.players add column if not exists player_code text;
alter table public.players add column if not exists category text;
alter table public.players add column if not exists image_url text;
alter table public.players add column if not exists image_filename text;
alter table public.players add column if not exists image_storage_path text;
alter table public.players add column if not exists is_captain boolean not null default false;
alter table public.players add column if not exists is_playing_captain boolean not null default false;
alter table public.players add column if not exists auction_amount numeric(15,2);
alter table public.players add column if not exists auction_metadata jsonb not null default '{}'::jsonb;
create unique index if not exists unique_source_team_per_tournament on public.teams(tournament_id,source_auction_team_id) where source_auction_team_id is not null;
create unique index if not exists unique_source_player_per_team on public.players(team_id,source_auction_player_id) where source_auction_player_id is not null;

-- Settings saved by owner/admin only through a server-side service-role RPC.
create or replace function public.set_tournament_game_rules(
 p_tournament_id uuid,p_best_of int,p_winning_score int,p_win_by_two boolean,p_point_cap int
) returns public.tournament_rules language plpgsql security invoker set search_path='' as $$
declare result public.tournament_rules%rowtype;
begin
 if p_best_of not in (1,3) or p_winning_score not between 11 and 30 or p_point_cap not between p_winning_score and 30 or p_win_by_two is null
 then raise exception 'Invalid game rules'; end if;
 perform 1 from public.tournaments where id=p_tournament_id for update;
 if not found then raise exception 'Tournament not found';end if;
 if exists(select 1 from public.matches where tournament_id=p_tournament_id and kind<>'team_tie' and (status<>'scheduled' or score_a>0 or score_b>0 or games<>'[]'::jsonb))
 then raise exception 'Cannot change scoring rules after a rubber has started';end if;
 update public.tournament_rules set default_best_of=p_best_of,default_winning_score=p_winning_score,
  default_win_by_two=p_win_by_two,default_point_cap=p_point_cap
 where tournament_id=p_tournament_id returning * into result;
 if not found then raise exception 'Tournament rules not found';end if;
 update public.matches set best_of=p_best_of,winning_score=p_winning_score,win_by_two=p_win_by_two,point_cap=p_point_cap,
 version=version+1,updated_at=now()
 where tournament_id=p_tournament_id and kind<>'team_tie' and status='scheduled';
 return result;
end $$;
revoke all on function public.set_tournament_game_rules(uuid,int,int,boolean,int) from public,anon,authenticated;
grant execute on function public.set_tournament_game_rules(uuid,int,int,boolean,int) to service_role;

-- Reject overwrites: this is an initial roster transfer, not a repair or database sync.
-- A failed insert rolls the whole import back in its PostgreSQL transaction.
create or replace function public.import_auction_roster(p_tournament_id uuid,p_document jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare t jsonb;p jsonb;new_team_id uuid;team_count int:=0;player_count int:=0;source_player_ids text[]:=array[]::text[];
begin
 perform pg_advisory_xact_lock(hashtext(p_tournament_id::text));
 perform 1 from public.tournaments where id=p_tournament_id for update;
 if not found then raise exception 'Tournament not found';end if;
 if (select stage from public.tournament_rules where tournament_id=p_tournament_id)<>'registration' then raise exception 'Imports permitted during registration only';end if;
 if exists(select 1 from public.teams where tournament_id=p_tournament_id) or exists(select 1 from public.matches where tournament_id=p_tournament_id)
 then raise exception 'Tournament must have no existing teams or fixtures';end if;
 if p_document->>'format'<>'s-tournament-auction-handoff' or p_document->>'version'<>'1'
 or p_document#>>'{source,system}'<>'s-auction-system' or p_document#>>'{source,status}'<>'completed'
 then raise exception 'Unrecognized or unfinished auction export';end if;
 if jsonb_typeof(p_document->'teams')<>'array' or jsonb_array_length(p_document->'teams')<>6 then raise exception 'Exactly six teams required';end if;
 for t in select value from jsonb_array_elements(p_document->'teams') loop
  if jsonb_typeof(t->'players')<>'array' or jsonb_array_length(t->'players')<>18 then raise exception 'Each team requires exactly 18 players';end if;
  if coalesce(length(nullif(trim(t->>'name'),'')),0)=0 or length(t->>'name')>80 then raise exception 'Invalid team name';end if;
  insert into public.teams(tournament_id,name,source_auction_team_id,captain_name,logo_filename,logo_url,auction_metadata)
  values(p_tournament_id,t->>'name',t->>'source_team_id',t->>'captain_name',t->>'logo_filename',t->>'logo_url',coalesce(t->'metadata','{}'::jsonb))
  returning id into new_team_id;
  team_count=team_count+1;
  for p in select value from jsonb_array_elements(t->'players') loop
   if coalesce(length(nullif(trim(p->>'name'),'')),0)=0 or length(p->>'name')>120 then raise exception 'Invalid player name';end if;
   if p->>'source_player_id'=any(source_player_ids) then raise exception 'Duplicate source player ID';end if;
   source_player_ids=array_append(source_player_ids,p->>'source_player_id');
   insert into public.players(team_id,name,source_auction_player_id,player_code,category,image_url,image_filename,image_storage_path,is_captain,is_playing_captain,auction_amount,auction_metadata)
   values(new_team_id,p->>'name',p->>'source_player_id',p->>'player_code',p->>'category',p->>'image_url',p->>'image_filename',p->>'image_storage_path',
     coalesce((p->>'is_captain')::boolean,false),coalesce((p->>'is_playing_captain')::boolean,false),(p->>'auction_amount')::numeric,coalesce(p->'metadata','{}'::jsonb));
   player_count=player_count+1;
  end loop;
 end loop;
 return jsonb_build_object('teams',team_count,'players',player_count,'status','imported');
end $$;
revoke all on function public.import_auction_roster(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.import_auction_roster(uuid,jsonb) to service_role;
