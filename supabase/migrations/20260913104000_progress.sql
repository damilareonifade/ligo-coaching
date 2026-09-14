-- ---------------------------------------------------------------------------
-- The Progress tab: volume, personal records, and body measurements.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- `is_pr` goes.
--
-- It was written by nothing. Every set in the app is saved with `isPr: false`
-- — in `newSessionExercise`, in `start_workout`, in every fixture — and no
-- screen renders it. A column that is read but never written is worse than a
-- missing one: `client_stats` counted it and returned zero forever, and the
-- next person to look would reasonably assume PRs were tracked.
--
-- A personal record is now derived: your best set on each lift, computed when
-- asked. That cannot go stale, and it is what the card actually shows.
-- ---------------------------------------------------------------------------
alter table public.workout_sets drop column is_pr;

create or replace function public.add_session_exercise(
  p_workout_session_id uuid,
  p_exercise_id uuid,
  p_name text,
  p_sets jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_next integer;
begin
  if length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception 'an exercise needs a name' using errcode = '23514';
  end if;

  -- Last, not first: a lift added mid-workout is one the lifter decided to do
  -- next, so it belongs at the end of what they have already been through.
  select coalesce(max(e.order_index) + 1, 0) into v_next
    from public.workout_exercises e
   where e.workout_session_id = p_workout_session_id;

  insert into public.workout_exercises (id, workout_session_id, name, order_index)
  values (p_exercise_id, p_workout_session_id, btrim(p_name), v_next);

  insert into public.workout_sets (workout_exercise_id, n, weight_kg, reps, completed)
  select
    p_exercise_id,
    s.n,
    coalesce(s.weight_kg, 0),
    coalesce(s.reps, 0),
    coalesce(s.completed, false)
  from jsonb_to_recordset(coalesce(p_sets, '[]'::jsonb)) as s(
    n integer,
    weight_kg numeric,
    reps integer,
    completed boolean
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Your best on each lift.
--
-- Heaviest wins; reps break a tie, so 100 kg × 5 beats 100 kg × 3 and both
-- beat 95 kg × 10. Deliberately not "most volume" — a personal record is a
-- thing you could not do before, and twenty easy reps is a different
-- achievement from one heavy one.
--
-- Only completed sets count. A set that was written down and not done is a
-- plan, and planning to lift something is not a record.
-- ---------------------------------------------------------------------------
create or replace function public.personal_records(
  p_client_id uuid,
  p_limit integer default 20
)
returns table (name text, weight_kg numeric, reps integer, achieved_at timestamptz)
language sql
security definer
stable
set search_path = ''
as $$
  select distinct on (lower(e.name))
    e.name,
    ws.weight_kg,
    ws.reps,
    coalesce(s.finished_at, s.started_at) as achieved_at
  from public.workout_sets ws
  join public.workout_exercises e on e.id = ws.workout_exercise_id
  join public.workout_sessions s on s.id = e.workout_session_id
  where s.client_id = p_client_id
    and ws.completed
    and ws.weight_kg > 0
    and (
      p_client_id = auth.uid()
      or public.has_client_permission(p_client_id, 'workouts')
    )
  order by lower(e.name), ws.weight_kg desc, ws.reps desc, achieved_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

comment on function public.personal_records(uuid, integer) is
  'Best completed set per lift. Heaviest wins, reps break the tie.';

grant execute on function public.personal_records(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Volume, week by week.
--
-- Load times reps over completed sets. Every week in the window is returned
-- including the empty ones, for the same reason `client_weekly_history` does
-- it: a chart that drops a quiet week tells the opposite of the truth.
-- ---------------------------------------------------------------------------
create or replace function public.volume_history(
  p_client_id uuid,
  p_weeks integer default 8
)
returns table (week_start timestamptz, volume_kg numeric)
language sql
security definer
stable
set search_path = ''
as $$
  select
    w.week_start,
    coalesce((
      select sum(ws.weight_kg * ws.reps)
        from public.workout_sets ws
        join public.workout_exercises e on e.id = ws.workout_exercise_id
        join public.workout_sessions s on s.id = e.workout_session_id
       where s.client_id = p_client_id
         and ws.completed
         and s.finished_at >= w.week_start
         and s.finished_at < w.week_start + interval '1 week'
    ), 0) as volume_kg
  from (
    select date_trunc('week', now()) - (n * interval '1 week') as week_start
      from generate_series(least(greatest(coalesce(p_weeks, 8), 1), 52) - 1, 0, -1) as n
  ) w
  where p_client_id = auth.uid()
     or public.has_client_permission(p_client_id, 'workouts');
$$;

comment on function public.volume_history(uuid, integer) is
  'Load times reps per week, empty weeks included.';

grant execute on function public.volume_history(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- May this coach write on this client's behalf?
--
-- `log_for` is the switch the client set on the permissions screen — "Sam can
-- log for me", described there as write access whose entries are labelled with
-- their name. A different question from `has_client_permission`: seeing what
-- somebody weighs and writing it down for them are not the same permission.
-- ---------------------------------------------------------------------------
create or replace function public.can_log_for(p_client_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.coach_clients cc
     where cc.coach_id = auth.uid()
       and cc.client_id = p_client_id
       and cc.status = 'active'
       and cc.log_for
  );
$$;

grant execute on function public.can_log_for(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Body measurements.
--
-- One row per logging moment rather than one per number, with every
-- measurement nullable. A client stepping off the scales fills `weight_kg` and
-- nothing else; a monthly check-in fills the lot and writes a note.
--
-- That shape is chosen with check-ins in mind: `ApiCheckIn` is a weight, a set
-- of measurements, a note and who logged it, which is exactly a row here. When
-- check-ins are built they read these rows rather than storing a second copy
-- of the same numbers — two places recording a waist measurement would
-- eventually disagree about it.
--
-- Stored in kg and cm always. The app converts for display from the units
-- preference, the same way every other weight in the schema works.
-- ---------------------------------------------------------------------------
create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users (id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric(5, 2),
  waist_cm numeric(5, 1),
  chest_cm numeric(5, 1),
  hips_cm numeric(5, 1),
  body_fat_pct numeric(4, 1),
  note text,
  -- The client, or a coach they gave write access to. The history says which.
  logged_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A row with nothing in it is not a measurement.
  constraint body_measurements_has_something check (
    weight_kg is not null or waist_cm is not null or chest_cm is not null
    or hips_cm is not null or body_fat_pct is not null
  ),
  constraint body_measurements_sane check (
    (weight_kg is null or weight_kg between 20 and 500)
    and (waist_cm is null or waist_cm between 20 and 300)
    and (chest_cm is null or chest_cm between 20 and 300)
    and (hips_cm is null or hips_cm between 20 and 300)
    and (body_fat_pct is null or body_fat_pct between 1 and 70)
  )
);

comment on table public.body_measurements is
  'One row per logging moment. Check-ins will read these rather than copy them.';

create index body_measurements_client_idx
  on public.body_measurements (client_id, measured_at desc);

create trigger body_measurements_set_updated_at
  before update on public.body_measurements
  for each row execute function public.set_updated_at();

alter table public.body_measurements enable row level security;

create policy body_measurements_all_own on public.body_measurements
  for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

-- `metrics` is the permission the client set on their own screen — described
-- there as "Weight, measurements, and progress photos".
create policy body_measurements_select_as_coach on public.body_measurements
  for select to authenticated
  using (public.has_client_permission(client_id, 'metrics'));

-- Seeing and writing are separate permissions, as with food.
create policy body_measurements_insert_as_coach on public.body_measurements
  for insert to authenticated
  with check (public.can_log_for(client_id) and logged_by = (select auth.uid()));

revoke all on public.body_measurements from anon, authenticated;
grant select, insert, update, delete on public.body_measurements to authenticated;

-- ---------------------------------------------------------------------------
-- And the profile hero stops counting a column that no longer exists.
--
-- "PRs" is now the number of lifts this person has a best on, which is what a
-- derived personal record means — one per exercise, not one per event.
-- ---------------------------------------------------------------------------
create or replace function public.client_stats(p_client_id uuid)
returns table (sessions integer, week_streak integer, personal_records integer)
language sql
security definer
stable
set search_path = ''
as $$
  with finished as (
    select date_trunc('week', s.finished_at) as week
      from public.workout_sessions s
     where s.client_id = p_client_id and s.finished_at is not null
     group by 1
  ),
  runs as (
    select week,
           week - (row_number() over (order by week))::integer * interval '1 week' as run
      from finished
  )
  select
    (
      select count(*)::integer from public.workout_sessions s
       where s.client_id = p_client_id and s.finished_at is not null
    ),
    coalesce((
      select count(*)::integer from runs
       where run = (select run from runs where week = date_trunc('week', now()))
    ), 0),
    (
      select count(distinct lower(e.name))::integer
        from public.workout_sets ws
        join public.workout_exercises e on e.id = ws.workout_exercise_id
        join public.workout_sessions s on s.id = e.workout_session_id
       where s.client_id = p_client_id and ws.completed and ws.weight_kg > 0
    )
   where p_client_id = auth.uid()
      or public.has_client_permission(p_client_id, 'workouts');
$$;

grant execute on function public.client_stats(uuid) to authenticated;
