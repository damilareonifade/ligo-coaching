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
