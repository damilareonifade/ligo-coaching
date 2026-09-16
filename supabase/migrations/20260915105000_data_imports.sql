-- ---------------------------------------------------------------------------
-- Bringing a training history in from somewhere else.
--
-- Somebody adopting Ligo has two or three years in Strong or Hevy. If that
-- cannot come with them their Progress tab is empty and their records are
-- wrong on the first day, which is exactly when the app has to look worth
-- keeping. Both export CSV of sessions and sets, which is what Ligo stores, so
-- nothing has to be invented in the middle.
--
-- Deliberately not built around a known column layout. These are consumer
-- apps with no contract for their exports — the headers can change in any
-- release and nobody will say so — so the schema records *that* something was
-- imported and *where it came from*, and the parsing lives in a function that
-- can be corrected without a migration.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Importing the same file twice must be a no-op, not a doubled history.
--
-- The key is composed by the parser from whatever identifies a session in the
-- source — a date and a workout name, usually. Unique per client rather than
-- globally: two people can each import a Tuesday "Upper A" and they are
-- different sessions.
-- ---------------------------------------------------------------------------
alter table public.workout_sessions
  add column imported_from text,
  add column imported_key text;

comment on column public.workout_sessions.imported_from is
  'Which app this came from. NULL for a session logged in Ligo itself.';

create unique index workout_sessions_import_key
  on public.workout_sessions (client_id, imported_from, imported_key)
  where imported_key is not null;

-- ---------------------------------------------------------------------------
-- What each run did.
--
-- An import is the one operation here that writes hundreds of rows on
-- somebody's behalf, so "what happened" has to be answerable afterwards — by
-- them, not only by us. `skipped` matters as much as `written`: a second run
-- of the same file should report everything skipped, and a person seeing that
-- knows it worked rather than wondering why nothing changed.
-- ---------------------------------------------------------------------------
create table public.data_imports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users (id) on delete cascade,
  source text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  -- The uploaded file, kept until the import finishes so a failed run can be
  -- looked at rather than guessed about.
  path text,
  sessions_written integer not null default 0,
  sets_written integer not null default 0,
  sessions_skipped integer not null default 0,
  error text,
  constraint data_imports_source_known check (source in ('strong', 'hevy'))
);

create index data_imports_client_idx
  on public.data_imports (client_id, started_at desc);

alter table public.data_imports enable row level security;

create policy data_imports_select_own on public.data_imports
  for select to authenticated
  using (client_id = (select auth.uid()));

revoke all on public.data_imports from anon, authenticated;
grant select on public.data_imports to authenticated;

-- ---------------------------------------------------------------------------
-- Private, and per person. An export is everything somebody has ever logged
-- and an import is the same file arriving; neither belongs in a public bucket.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('imports', 'imports', false, 20971520)
    on conflict (id) do nothing;
  end if;
end $$;
