-- ---------------------------------------------------------------------------
-- Device sessions.
--
-- This is NOT a reimplementation of auth.sessions — GoTrue owns access and
-- refresh tokens, and duplicating them would mean two sources of truth for
-- whether someone is signed in. This table answers a product question GoTrue
-- cannot: which devices is this person signed in on, when was each last used,
-- and where should a session reminder be pushed.
-- ---------------------------------------------------------------------------

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  -- Stable per install, generated on the device. Not a secret: it only ever
  -- appears alongside a user_id the RLS policy has already matched.
  device_id text not null,
  device_name text not null default '',
  platform text not null,
  app_version text not null default '',
  push_token text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint sessions_platform_check check (platform in ('ios', 'android', 'web')),
  constraint sessions_device_id_length check (char_length(device_id) between 1 and 128),
  constraint sessions_device_name_length check (char_length(device_name) <= 120),
  constraint sessions_push_token_length check (push_token is null or char_length(push_token) <= 512)
);

comment on table public.sessions is
  'App-level device sessions. Auth tokens live in auth.sessions and are not mirrored here.';

-- One row per install, so signing in again updates rather than accumulates.
-- This is also the conflict target the app upserts against.
create unique index sessions_user_device_key on public.sessions (user_id, device_id);

-- "My devices, most recent first" — the only listing the app performs.
create index sessions_user_last_seen_idx on public.sessions (user_id, last_seen_at desc);

-- Push fan-out reads live sessions with a token and nothing else. Partial, so
-- revoked rows and simulator installs without a token cost nothing to skip.
create index sessions_push_idx on public.sessions (user_id)
  where revoked_at is null and push_token is not null;

-- This table's mutable timestamp is `last_seen_at`, not `updated_at`, so it
-- gets its own trigger rather than a redundant second column.
create or replace function public.set_last_seen_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.last_seen_at := now();
  return new;
end;
$$;

create trigger sessions_set_last_seen
  before update on public.sessions
  for each row execute function public.set_last_seen_at();

alter table public.sessions enable row level security;

create policy sessions_select_own on public.sessions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy sessions_insert_own on public.sessions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy sessions_update_own on public.sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy sessions_delete_own on public.sessions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.sessions from anon, authenticated;
grant select, insert, update, delete on public.sessions to authenticated;
