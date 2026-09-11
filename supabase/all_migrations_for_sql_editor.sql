-- ===========================================================
-- Ligo schema — all migrations concatenated, in order.
--
-- For pasting into Supabase → SQL Editor when the CLI is not
-- set up. Run ONCE on a fresh project.
--
-- Already ran an earlier version of this file? Apply only the
-- migrations you have not yet run, individually.
--
-- Tell the CLI ledger afterwards so a later 'db push' does not
-- try to re-apply them:
--   npx supabase migration repair --status applied 20260910090000
--   npx supabase migration repair --status applied 20260910090100
--   npx supabase migration repair --status applied 20260910090200
--   npx supabase migration repair --status applied 20260910090300
--   npx supabase migration repair --status applied 20260910090400
--   npx supabase migration repair --status applied 20260910093000
-- ===========================================================

-- ─────────────────────────────────────────────────────────
-- 20260910090000_app_foundation.sql
-- ─────────────────────────────────────────────────────────
-- ---------------------------------------------------------------------------
-- Ligo foundation: the profile mirror of auth.users, plus the privilege model
-- every later migration inherits.
--
-- Supabase's GoTrue owns `auth.users` (credentials, email confirmation,
-- refresh tokens). Application data must never key off it directly, so
-- `public.users` mirrors the identity and holds everything the app decides:
-- display name, role, onboarding state.
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('client', 'coach');

-- Every table below uses this. `search_path = ''` is pinned because a
-- trigger function that resolves names through a caller-controlled path is a
-- privilege-escalation vector, and Supabase's linter rejects it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  role public.user_role not null default 'client',
  -- False until the person actually picked a side. A Google sign-in creates
  -- the row before we know whether they are a coach or a client, and the app
  -- uses this flag to decide whether to ask.
  role_confirmed boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_not_blank check (btrim(email) <> ''),
  constraint users_full_name_length check (char_length(full_name) <= 120),
  constraint users_avatar_url_length check (avatar_url is null or char_length(avatar_url) <= 2048)
);

comment on table public.users is
  'Application profile for each auth.users row. Created by trigger on signup.';

-- Case-insensitive uniqueness without the citext extension: the functional
-- index is what the lookup below plans against, so both stay in step.
create unique index users_email_lower_key on public.users (lower(email));

-- Coaches are the minority of rows and the only ones ever listed as a group,
-- so the index carries only them and stays small as the client base grows.
create index users_coach_idx on public.users (created_at desc) where role = 'coach';

-- Answers "who still has to choose a role?" — a tiny, mostly-empty index that
-- keeps the signup completion check off a sequential scan.
create index users_role_pending_idx on public.users (id) where role_confirmed = false;

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Signup: create the profile from whatever the provider told us.
--
-- Email signup passes `role` and `full_name` through signUp's `options.data`,
-- which GoTrue stores in raw_user_meta_data. Google sends `name`/`picture`
-- and no role — hence role_confirmed = false and the app asking later.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  claimed_role text := meta ->> 'role';
  -- coalesce, not a bare IN: Google sends no role at all, and `null in (...)`
  -- is null rather than false, which would fail the not-null column below.
  has_role boolean := coalesce(claimed_role in ('client', 'coach'), false);
begin
  insert into public.users (id, email, full_name, avatar_url, role, role_confirmed)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(meta ->> 'full_name', meta ->> 'name', ''), 120),
    nullif(coalesce(meta ->> 'avatar_url', meta ->> 'picture'), ''),
    case when has_role then claimed_role::public.user_role else 'client' end,
    has_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- GoTrue is the source of truth for the address, and a Google account can
-- change its name or photo between sign-ins. Only fill what the app has not
-- set itself, so a rename in Ligo is not overwritten by the provider.
create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  update public.users u
     set email = coalesce(new.email, u.email),
         full_name = case
           when u.full_name = '' then left(coalesce(meta ->> 'full_name', meta ->> 'name', ''), 120)
           else u.full_name
         end,
         avatar_url = coalesce(
           u.avatar_url,
           nullif(coalesce(meta ->> 'avatar_url', meta ->> 'picture'), '')
         )
   where u.id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_auth_user_updated();

-- ---------------------------------------------------------------------------
-- What an end user may change about themselves.
--
-- The update policy below is row-scoped but not column-scoped, so without
-- this trigger a signed-in client could PATCH `role = 'coach'` and walk into
-- the coach app. Role is writable exactly once — while it is unconfirmed.
-- The guard applies only to `authenticated`; migrations and server-side jobs
-- run as the table owner or service_role and are deliberately unrestricted.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_user_column_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.id <> old.id then
    raise exception 'id is immutable' using errcode = '42501';
  end if;

  if lower(new.email) <> lower(old.email) then
    raise exception 'email is managed by Supabase Auth' using errcode = '42501';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'created_at is immutable' using errcode = '42501';
  end if;

  if old.role_confirmed and new.role <> old.role then
    raise exception 'role cannot be changed once confirmed' using errcode = '42501';
  end if;

  -- Confirming is one-way; un-confirming would reopen the role for writing.
  if old.role_confirmed and not new.role_confirmed then
    raise exception 'role_confirmed cannot be reverted' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger users_enforce_column_rules
  before update on public.users
  for each row execute function public.enforce_user_column_rules();

-- ---------------------------------------------------------------------------
-- Row Level Security.
--
-- Note the `(select auth.uid())` wrapping: as a bare call, auth.uid() is
-- re-evaluated for every candidate row; wrapped in a scalar subquery Postgres
-- hoists it into an InitPlan and runs it once per statement. On a large table
-- that is the difference between an index scan and a per-row function call.
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;

create policy users_select_own on public.users
  for select to authenticated
  using ((select auth.uid()) = id);

create policy users_update_own on public.users
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No insert policy: rows arrive only through the signup trigger.
-- No delete policy: deletion cascades from auth.users, which clients cannot touch.

-- ---------------------------------------------------------------------------
-- Least privilege. Supabase grants the API roles broad table access by
-- default and relies on RLS alone; narrowing the grants means a missing
-- policy fails closed instead of open.
--
-- This is also the answer to "users must not be able to migrate tables":
-- `anon` and `authenticated` are the only roles the publishable key can
-- assume, neither owns any object here, and revoking CREATE on the schema
-- removes the last route to DDL. Migrations run as the table owner through
-- the CLI — see supabase/README.md.
-- ---------------------------------------------------------------------------
revoke create on schema public from anon, authenticated;

revoke all on public.users from anon, authenticated;
grant select, update on public.users to authenticated;

-- ─────────────────────────────────────────────────────────
-- 20260910090100_sessions.sql
-- ─────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────
-- 20260910090200_cache.sql
-- ─────────────────────────────────────────────────────────
-- ---------------------------------------------------------------------------
-- Server-side cache.
--
-- The device already caches with MMKV; this is the layer that survives a
-- reinstall and follows a coach onto a second device. Values are per-user and
-- opaque to the server: a key, a JSON blob, and an expiry.
--
-- Deliberately not a shared cache. A global keyspace would need policies that
-- reason about who may read which key, and the first mistake there leaks one
-- coach's roster to another. Scoping every row to its owner makes the policy
-- a single equality test.
-- ---------------------------------------------------------------------------

create table public.cache (
  user_id uuid not null references public.users (id) on delete cascade,
  key text not null,
  value jsonb not null,
  -- Null means "until explicitly invalidated"; the app sets a TTL for
  -- anything it can re-derive from the API.
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, key),
  constraint cache_key_length check (char_length(key) between 1 and 200),
  constraint cache_value_size check (pg_column_size(value) <= 1048576)
);

comment on table public.cache is
  'Per-user key/value cache with optional TTL. Never the source of truth for anything.';

-- The composite primary key already indexes (user_id, key) lookups, which is
-- every read the app performs. The only additional access path is the sweeper.
create index cache_expires_at_idx on public.cache (expires_at)
  where expires_at is not null;

create trigger cache_set_updated_at
  before update on public.cache
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Expiry.
--
-- RLS cannot express "and not expired", so reads filter on expires_at and the
-- sweeper reclaims the space. Without this the table grows forever, which is
-- how a cache becomes the largest relation in a database.
-- ---------------------------------------------------------------------------
create or replace function public.purge_expired_cache()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed bigint;
begin
  delete from public.cache where expires_at is not null and expires_at <= now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

comment on function public.purge_expired_cache() is
  'Deletes expired cache rows. Schedule with pg_cron; see supabase/README.md.';

-- Not granted to anon/authenticated: sweeping the whole table is an operator
-- action, and a client that could call it could evict every user's cache.
revoke all on function public.purge_expired_cache() from public, anon, authenticated;

alter table public.cache enable row level security;

create policy cache_select_own on public.cache
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy cache_insert_own on public.cache
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy cache_update_own on public.cache
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy cache_delete_own on public.cache
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.cache from anon, authenticated;
grant select, insert, update, delete on public.cache to authenticated;

-- ─────────────────────────────────────────────────────────
-- 20260910090300_password_resets.sql
-- ─────────────────────────────────────────────────────────
-- ---------------------------------------------------------------------------
-- Password reset audit and throttle.
--
-- One deliberate omission: there are no reset tokens in this table. GoTrue
-- already issues, hashes, expires and single-uses them, and a second token
-- store would be a worse copy of a solved problem — the failure mode being a
-- reset link that stays valid after the real one was consumed. The app calls
-- `resetPasswordForEmail`, and this table records that it happened so the
-- flow can be rate-limited and audited.
-- ---------------------------------------------------------------------------

create table public.password_reset_requests (
  id bigint generated always as identity primary key,
  -- Stored lowercased by the function below. Intentionally not a foreign key
  -- to public.users: a request for an unknown address must be recordable, or
  -- the throttle can be bypassed by guessing addresses.
  email text not null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint password_reset_email_length check (char_length(email) between 3 and 320)
);

comment on table public.password_reset_requests is
  'Audit trail and rate-limit ledger for password resets. Tokens live in GoTrue.';

-- The throttle query is "requests for this address in the last N minutes",
-- which this index answers directly.
create index password_reset_email_requested_idx
  on public.password_reset_requests (email, requested_at desc);

-- Retention sweep: the ledger only needs a recent window.
create index password_reset_requested_at_idx
  on public.password_reset_requests (requested_at);

-- ---------------------------------------------------------------------------
-- RLS with no policies at all: enabled means deny-by-default, and nothing
-- grants `anon`/`authenticated` a way in. The rows are an audit trail, and an
-- audit trail a client can read tells an attacker which addresses have
-- accounts. All access goes through the definer function below.
-- ---------------------------------------------------------------------------
alter table public.password_reset_requests enable row level security;

revoke all on public.password_reset_requests from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Records a reset attempt, or raises if the address has asked too often.
--
-- Returns nothing about whether the account exists — the caller gets the same
-- answer either way, so this cannot be used to enumerate users.
-- ---------------------------------------------------------------------------
create or replace function public.record_password_reset_request(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text := lower(btrim(p_email));
  recent integer;
begin
  if normalized = '' or position('@' in normalized) = 0 then
    raise exception 'A valid email address is required' using errcode = '22023';
  end if;

  select count(*) into recent
    from public.password_reset_requests
   where email = normalized
     and requested_at > now() - interval '15 minutes';

  if recent >= 3 then
    raise exception 'Too many reset requests for this address. Try again in 15 minutes.'
      using errcode = '54000';
  end if;

  insert into public.password_reset_requests (email) values (normalized);
end;
$$;

-- `anon` too: someone who has forgotten their password is by definition not
-- signed in.
grant execute on function public.record_password_reset_request(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Marks the most recent open request for an address as completed. Called
-- after the new password is accepted, so the ledger shows which requests were
-- actually used.
-- ---------------------------------------------------------------------------
create or replace function public.complete_password_reset_request(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text := lower(btrim(p_email));
begin
  update public.password_reset_requests
     set completed_at = now()
   where id = (
     select id
       from public.password_reset_requests
      where email = normalized
        and completed_at is null
      order by requested_at desc
      limit 1
   );
end;
$$;

grant execute on function public.complete_password_reset_request(text) to authenticated;

-- Retention: keep a quarter of history, no more. Operator-only, like the
-- cache sweeper.
create or replace function public.purge_old_password_reset_requests()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed bigint;
begin
  delete from public.password_reset_requests
   where requested_at < now() - interval '90 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_old_password_reset_requests() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────
-- 20260910090400_coach_clients.sql
-- ─────────────────────────────────────────────────────────
-- ---------------------------------------------------------------------------
-- The coach ↔ client link.
--
-- Included because it is the one relation the rest of Ligo hangs off: a
-- program, a session log and a check-in are all "this coach, that client",
-- and a users table alone cannot express the app's core idea. Every domain
-- table added later should reference this link rather than re-deriving who
-- may see whom.
--
-- Scoped deliberately small — status, permissions, timestamps — so replacing
-- it costs one migration if the roster model turns out differently.
-- ---------------------------------------------------------------------------

create type public.coach_client_status as enum ('pending', 'active', 'paused', 'ended');

create table public.coach_clients (
  coach_id uuid not null references public.users (id) on delete cascade,
  client_id uuid not null references public.users (id) on delete cascade,
  status public.coach_client_status not null default 'pending',
  -- What the client has agreed to share, mirroring the onboarding screen.
  -- A coach reading a client's data checks this, never just the link.
  permissions jsonb not null default
    '{"workouts": false, "nutrition": false, "metrics": false}'::jsonb,
  -- True when the client asked the coach to log sessions on their behalf.
  log_for boolean not null default false,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (coach_id, client_id),
  constraint coach_clients_no_self_link check (coach_id <> client_id),
  constraint coach_clients_permission_keys check (
    permissions ?& array['workouts', 'nutrition', 'metrics']
  )
);

comment on table public.coach_clients is
  'Roster membership. The authority on which coach may read which client.';

-- The primary key covers every coach-side read ("my roster"). The reverse
-- direction — "who coaches me" — needs its own index, partial because the app
-- only ever asks about live links.
create index coach_clients_client_active_idx on public.coach_clients (client_id)
  where status = 'active';

-- Roster listings sort by recency and filter by status.
create index coach_clients_coach_status_idx
  on public.coach_clients (coach_id, status, accepted_at desc);

create trigger coach_clients_set_updated_at
  before update on public.coach_clients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS.
--
-- These policies deliberately reference only auth.uid() and this table's own
-- columns. A policy here that selected from public.users, whose own policies
-- select from this table, would recurse — Postgres detects it and errors at
-- query time, which is a miserable way to find out.
-- ---------------------------------------------------------------------------
alter table public.coach_clients enable row level security;

create policy coach_clients_select_either_side on public.coach_clients
  for select to authenticated
  using ((select auth.uid()) in (coach_id, client_id));

-- Either side may create the link: a coach invites, or a client attaches with
-- an invite code. The row must include the creator.
create policy coach_clients_insert_either_side on public.coach_clients
  for insert to authenticated
  with check ((select auth.uid()) in (coach_id, client_id));

create policy coach_clients_update_either_side on public.coach_clients
  for update to authenticated
  using ((select auth.uid()) in (coach_id, client_id))
  with check ((select auth.uid()) in (coach_id, client_id));

create policy coach_clients_delete_either_side on public.coach_clients
  for delete to authenticated
  using ((select auth.uid()) in (coach_id, client_id));

revoke all on public.coach_clients from anon, authenticated;
grant select, insert, update, delete on public.coach_clients to authenticated;

-- ---------------------------------------------------------------------------
-- Now that the link exists, a coach can read their clients' profiles — and
-- only theirs. Added here rather than in the foundation migration so the
-- dependency runs in one direction.
--
-- `security definer` breaks the policy recursion described above: the helper
-- reads coach_clients with RLS bypassed, and is safe to do so because it
-- answers a single yes/no about the caller's own id.
-- ---------------------------------------------------------------------------
create or replace function public.is_linked_to(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
      from public.coach_clients cc
     where cc.status = 'active'
       and (
         (cc.coach_id = auth.uid() and cc.client_id = p_user_id)
         or (cc.client_id = auth.uid() and cc.coach_id = p_user_id)
       )
  );
$$;

comment on function public.is_linked_to(uuid) is
  'True when the caller and the given user share an active roster link.';

grant execute on function public.is_linked_to(uuid) to authenticated;

create policy users_select_linked on public.users
  for select to authenticated
  using (public.is_linked_to(id));

-- ─────────────────────────────────────────────────────────
-- 20260910093000_function_grants.sql
-- ─────────────────────────────────────────────────────────
-- ---------------------------------------------------------------------------
-- Least privilege for functions, and one signature change.
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default, so
-- `grant execute ... to authenticated` in the earlier migrations added a
-- grant without removing the implicit one. Verified against the deployed
-- project: `anon` could call both `is_linked_to` and, worse,
-- `complete_password_reset_request` — letting an unauthenticated caller mark
-- any address's reset request as completed and corrupt the audit trail.
--
-- The two sweepers were already revoked explicitly and were never exposed.
-- ---------------------------------------------------------------------------

revoke all on function public.is_linked_to(uuid) from public;
grant execute on function public.is_linked_to(uuid) to authenticated;

revoke all on function public.record_password_reset_request(text) from public;
-- `anon` keeps this one on purpose: someone who has forgotten their password
-- is by definition not signed in.
grant execute on function public.record_password_reset_request(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- `complete_password_reset_request` loses its parameter.
--
-- Taking an address as an argument meant any caller who could execute it
-- could aim it at any row. The only address it should ever close out is the
-- caller's own, and the recovery session already carries that in its JWT —
-- so read it from there and leave nothing to tamper with.
-- ---------------------------------------------------------------------------
drop function if exists public.complete_password_reset_request(text);

create or replace function public.complete_password_reset_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
begin
  if caller_email = '' then
    raise exception 'No signed-in address to complete' using errcode = '42501';
  end if;

  update public.password_reset_requests
     set completed_at = now()
   where id = (
     select id
       from public.password_reset_requests
      where email = caller_email
        and completed_at is null
      order by requested_at desc
      limit 1
   );
end;
$$;

revoke all on function public.complete_password_reset_request() from public;
grant execute on function public.complete_password_reset_request() to authenticated;

