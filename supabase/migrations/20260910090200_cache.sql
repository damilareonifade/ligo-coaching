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
