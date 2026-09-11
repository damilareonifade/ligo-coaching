-- ---------------------------------------------------------------------------
-- Profiles for accounts that predate this schema.
--
-- `on_auth_user_created` fires on INSERT into auth.users. Anyone who signed
-- in with Google while the tables did not yet exist already has their
-- auth.users row, so signing in again inserts nothing, the trigger never
-- runs, and the app fails with "Your profile could not be found".
--
-- The triggers are re-asserted first: if their original creation failed (it
-- needs rights on the auth schema), that would produce the same symptom for
-- *new* signups too, and re-running them here is harmless if they are
-- already in place.
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_auth_user_updated();

-- ---------------------------------------------------------------------------
-- A function rather than a bare INSERT, so it can be re-run after an import
-- and exercised by supabase/verify/01_checks.sql.
--
-- Resolves each field exactly as the signup trigger does; the two must not
-- drift, or a backfilled account differs from a freshly created one.
-- ---------------------------------------------------------------------------
create or replace function public.backfill_missing_profiles()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  created bigint;
begin
  insert into public.users (id, email, full_name, avatar_url, role, role_confirmed)
  select
    u.id,
    coalesce(u.email, ''),
    left(
      coalesce(
        coalesce(u.raw_user_meta_data, '{}'::jsonb) ->> 'full_name',
        coalesce(u.raw_user_meta_data, '{}'::jsonb) ->> 'name',
        ''
      ),
      120
    ),
    nullif(
      coalesce(
        coalesce(u.raw_user_meta_data, '{}'::jsonb) ->> 'avatar_url',
        coalesce(u.raw_user_meta_data, '{}'::jsonb) ->> 'picture'
      ),
      ''
    ),
    case
      when coalesce(u.raw_user_meta_data, '{}'::jsonb) ->> 'role' in ('client', 'coach')
        then (coalesce(u.raw_user_meta_data, '{}'::jsonb) ->> 'role')::public.user_role
      else 'client'
    end,
    coalesce(
      coalesce(u.raw_user_meta_data, '{}'::jsonb) ->> 'role' in ('client', 'coach'),
      false
    )
  from auth.users u
  -- public.users.email carries a not-blank check, so an account with no
  -- address (phone-only signup) is skipped rather than failing the batch.
  where coalesce(btrim(u.email), '') <> ''
  on conflict (id) do nothing;

  get diagnostics created = row_count;
  return created;
end;
$$;

comment on function public.backfill_missing_profiles() is
  'Creates public.users rows for auth.users that have none. Safe to re-run.';

-- Operator-only: it reads every account in the project.
revoke all on function public.backfill_missing_profiles() from public, anon, authenticated;

select public.backfill_missing_profiles();
