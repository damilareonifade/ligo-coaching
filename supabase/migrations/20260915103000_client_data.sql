-- ---------------------------------------------------------------------------
-- Data & privacy: what somebody actually has, and a record of exports.
--
-- The screen has been on the old host since it was written, so its counts have
-- always been fixture numbers. These are the real ones.
--
-- `security invoker`, so every count is filtered by the same RLS the rest of
-- the app reads through. A definer function here would have to re-state "only
-- your own rows" in six places, and one of them would eventually be wrong —
-- this way the policies are the single answer.
-- ---------------------------------------------------------------------------
create or replace function public.client_data_counts()
returns table (label text, value text)
language sql
security invoker
stable
set search_path = ''
as $$
  -- Ordered as a person would ask: what I did, then what I measured, then
  -- what I was given.
  select 'Workouts logged',
         count(*)::text
    from public.workout_sessions s
   where s.client_id = auth.uid() and s.finished_at is not null

  union all
  select 'Sets logged',
         count(*)::text
    from public.workout_sets ws
    join public.workout_exercises we on we.id = ws.workout_exercise_id
    join public.workout_sessions s on s.id = we.workout_session_id
   where s.client_id = auth.uid()

  union all
  select 'Check-ins',
         count(*)::text
    from public.body_measurements m
   where m.client_id = auth.uid()

  union all
  select 'Routines',
         count(*)::text
    from public.routine_instances r
   where r.client_id = auth.uid()

  union all
  select 'Health notes',
         count(*)::text
    from public.health_entries h
   where h.client_id = auth.uid();
$$;

comment on function public.client_data_counts() is
  'How much of themselves a client has in Ligo. RLS scopes it to the caller.';

grant execute on function public.client_data_counts() to authenticated;

-- ---------------------------------------------------------------------------
-- A record of every export.
--
-- Not for the app's benefit — the screen only needs the latest date — but
-- because "give me my data" is a request somebody may have to be shown was
-- answered, and a promise with no record of being kept is not much of one.
-- ---------------------------------------------------------------------------
create table public.data_exports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users (id) on delete cascade,
  requested_at timestamptz not null default now(),
  finished_at timestamptz,
  -- Object path in the private `exports` bucket. NULL while running or failed.
  path text,
  bytes integer,
  format text not null default 'json',
  error text
);

create index data_exports_client_idx
  on public.data_exports (client_id, requested_at desc);

alter table public.data_exports enable row level security;

-- Read your own, and nothing else. Writing is the export function's job, which
-- runs as the service role and is not subject to this.
create policy data_exports_select_own on public.data_exports
  for select to authenticated
  using (client_id = (select auth.uid()));

revoke all on public.data_exports from anon, authenticated;
grant select on public.data_exports to authenticated;

-- ---------------------------------------------------------------------------
-- Private, unlike the exercise animations.
--
-- An export is everything a person has ever logged. A public bucket would
-- make it readable by anyone who guessed the path, so the function hands back
-- a signed URL that expires instead.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('exports', 'exports', false, 52428800)
    on conflict (id) do nothing;
  end if;
end $$;
