-- ---------------------------------------------------------------------------
-- The exercise catalogue.
--
-- `public.exercises` has existed since the training migration and nothing has
-- ever put a row in it that a coach did not type themselves — no migration
-- seeds it, so against live data the picker offers a coach only their own
-- inventions. This is the shape the shared library needs to arrive in.
--
-- The source is WorkoutX (workoutxapp.com): 1,400-odd exercises with animated
-- previews, target and secondary muscles, equipment and instructions. Imported
-- rather than queried live, for three reasons that all point the same way:
--
--   The key. Authentication is a header, and anything in an Expo bundle can be
--   read out of it. The key lives in an Edge Function secret and the app never
--   sees it.
--
--   The quota. 500 requests a month on the free tier, capped at ten results a
--   call. A picker that searched as you typed would exhaust a month in an
--   afternoon. A full import is fourteen requests.
--
--   The gym. This picker is used on bad wifi in a basement. A catalogue in our
--   own table answers instantly and answers offline; a proxied one does not
--   answer at all exactly when it is needed.
--
-- Nothing here can break an existing routine: `routine_blocks.name` is text,
-- not a reference, so no row in this table is pointed at by anything.
-- ---------------------------------------------------------------------------

alter table public.exercises
  -- NULL for a row somebody typed. 'workoutx' for an imported one — the two
  -- are told apart everywhere by this and not by guessing from the shape.
  add column source text,
  add column external_id text,
  add column gif_url text,
  add column body_part text,
  add column target text,
  add column equipment text,
  add column secondary_muscles text[] not null default '{}',
  add column instructions text[] not null default '{}',
  add column difficulty text,
  -- 'compound' | 'isolation'
  add column mechanic text,
  -- 'push' | 'pull' | 'hold' | 'carry'
  add column force text,
  -- When the import last wrote this row, so a stalled sync is visible rather
  -- than merely suspected.
  add column synced_at timestamptz;

comment on column public.exercises.source is
  'NULL = authored in the app. Otherwise the catalogue it was imported from.';

-- The upsert target.
--
-- Deliberately not partial. A partial unique index cannot be inferred as an
-- ON CONFLICT arbiter unless the statement repeats its predicate, and the
-- import upserts through supabase-js, which does not. Plain works because
-- NULLs are distinct in a unique index: every authored row is (NULL, NULL) and
-- none of them collide, while two imported rows with the same id do.
create unique index exercises_source_external_key
  on public.exercises (source, external_id);

-- The picker filters on these three the moment they are populated.
create index exercises_body_part_idx on public.exercises (body_part)
  where body_part is not null;
create index exercises_equipment_idx on public.exercises (equipment)
  where equipment is not null;

-- ---------------------------------------------------------------------------
-- An imported row belongs to nobody, and nobody may edit it.
--
-- `exercises_write_own` already scopes writes to `owner_id = auth.uid()`, so a
-- client cannot touch a shared row — but it would happily let them *create*
-- one claiming to be imported, and a catalogue entry nobody can trace is worse
-- than one that is missing. The import runs as the service role, which is not
-- `authenticated` and is not subject to this.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_exercise_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.source is not null then
    raise exception 'only the catalogue import may write an imported exercise'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and old.source is not null then
    raise exception 'imported exercises are not editable' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger exercises_enforce_source
  before insert or update on public.exercises
  for each row execute function public.enforce_exercise_source();

-- ---------------------------------------------------------------------------
-- What the last import did.
--
-- One row per run. Without it "is the catalogue current" is answered by
-- counting rows and hoping — and a sync that has been failing quietly for two
-- months looks exactly like one that had nothing to do.
-- ---------------------------------------------------------------------------
create table public.catalogue_syncs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  -- Rows written, and pages fetched. The second is the quota cost.
  written integer not null default 0,
  requests integer not null default 0,
  -- WorkoutX returns `datasetETag`; a run where it has not moved wrote nothing
  -- new, which is a success and not a failure.
  dataset_etag text,
  error text
);

comment on table public.catalogue_syncs is
  'One row per catalogue import run. Read by nobody in the app — this is for us.';

alter table public.catalogue_syncs enable row level security;

-- No policies at all: the service role bypasses RLS and is the only writer,
-- and there is nothing here a signed-in person needs to see.
revoke all on public.catalogue_syncs from anon, authenticated;

-- ---------------------------------------------------------------------------
-- The picker's three composed fields, derived rather than imported.
--
-- `meta`, `tag` and `muscle_group` are what the picker row actually renders,
-- and they existed before this. Composing them here means the import writes
-- the raw facts and the presentation stays in one place — the same reason the
-- notification feed composes its own words.
-- ---------------------------------------------------------------------------
create or replace function public.exercise_meta(p_equipment text, p_body_part text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    concat_ws(' · ', initcap(nullif(btrim(p_equipment), '')), initcap(nullif(btrim(p_body_part), ''))),
    ''
  );
$$;

create or replace function public.set_exercise_presentation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.source is null then
    return new;
  end if;

  new.meta := coalesce(public.exercise_meta(new.equipment, new.body_part), '');
  new.tag := case when new.mechanic = 'compound' then 'Compound' else 'Accessory' end;
  new.muscle_group := coalesce(initcap(nullif(btrim(new.body_part), '')), 'Other');

  return new;
end;
$$;

create trigger exercises_set_presentation
  before insert or update on public.exercises
  for each row execute function public.set_exercise_presentation();
