-- Local-only stand-in for what a real Supabase project provides. NOT shipped.
-- Roles are cluster-wide, so they outlive dropdb; create only if absent.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;
grant usage on schema public to anon, authenticated, service_role;

-- Supabase grants EXECUTE on newly created functions to the API roles via
-- ALTER DEFAULT PRIVILEGES. Without this, a `revoke ... from public` looks
-- sufficient locally while anon keeps its own explicit grant in production —
-- which is exactly the false pass this stub once gave.
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

-- GoTrue's table, reduced to the columns the triggers read.
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Supabase resolves the caller from the request JWT; locally we read the same
-- GUC PostgREST sets, so policies exercise the real code path.
-- `nullif(..., '')` before the cast: an unset GUC reads back as the empty
-- string, and ''::jsonb raises instead of yielding null the way the real
-- helpers do for an unauthenticated caller.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', ''
  )::uuid;
$$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb
  );
$$;

grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
