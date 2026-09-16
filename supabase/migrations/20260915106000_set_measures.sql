-- ---------------------------------------------------------------------------
-- Sets that are not load × reps.
--
-- A real Hevy export made the gap obvious. A treadmill row has no weight and
-- no reps — only distance and duration — so the importer had to throw it away.
-- A farmers walk has a load and a distance but no reps. A pull-up has reps and
-- no load. A plank has neither.
--
-- Ligo could store exactly one of those shapes, and stored the rest as zeros,
-- which is the ambiguity this migration removes: a `reps` of 0 used to mean
-- either "this exercise is not counted in reps" or "they failed the set", and
-- nothing could tell the two apart.
--
-- The fix is not nullable columns. `weight_kg` and `reps` stay as they are —
-- making them nullable would push a `?? 0` into every read in the session
-- screen for no gain. What changes is that the *exercise* now says how it is
-- measured, and the measure is the authority. A zero in a column the measure
-- does not use is not a value at all.
-- ---------------------------------------------------------------------------

alter table public.exercises
  add column measure text not null default 'load_reps';

comment on column public.exercises.measure is
  'How a set of this exercise is counted. The authority on which columns mean anything.';

alter table public.exercises add constraint exercises_measure_known check (
  measure in (
    -- A barbell bench press. The overwhelming majority.
    'load_reps',
    -- A pull-up, a box jump. Reps only; the load is the body.
    'reps',
    -- A plank, a dead hang. Held rather than repeated.
    'duration',
    -- A treadmill, a row, a bike. How far and how long.
    'distance_duration',
    -- A farmers walk, a sled push. Loaded, and measured in ground covered.
    'load_distance'
  )
);

-- ---------------------------------------------------------------------------
-- The two measures a set had no room for.
--
-- Nullable, and genuinely so: most sets have neither, and a default of zero
-- would reintroduce exactly the ambiguity the measure exists to settle.
-- ---------------------------------------------------------------------------
alter table public.workout_sets
  add column distance_km numeric(7, 3),
  add column duration_seconds integer;

alter table public.workout_sets
  add constraint workout_sets_distance_not_negative
    check (distance_km is null or distance_km >= 0),
  add constraint workout_sets_duration_not_negative
    check (duration_seconds is null or duration_seconds >= 0);

-- The same two on a prescription, so a coach can write "run 5km" or "hold for
-- 60 seconds" rather than only "3 × 10".
alter table public.routine_blocks add column target_distance_km numeric(7, 3);
alter table public.routine_blocks add column target_duration_seconds integer;
alter table public.program_blocks add column target_distance_km numeric(7, 3);
alter table public.program_blocks add column target_duration_seconds integer;

-- ---------------------------------------------------------------------------
-- The catalogue's opening guess.
--
-- WorkoutX does not say how an exercise is measured, but two of its fields
-- imply it well enough to start from: a cardio body part is distance and
-- duration, and body-weight equipment is reps. Everything else is load × reps,
-- which is what almost everything is.
--
-- A guess, and said to be one. Nothing in the app can correct it yet — that
-- wants a control on the exercise, which is a separate piece of work.
-- ---------------------------------------------------------------------------
update public.exercises
   set measure = case
     when lower(coalesce(body_part, '')) = 'cardio' then 'distance_duration'
     when lower(coalesce(equipment, '')) in ('body weight', 'bodyweight', 'assisted')
       then 'reps'
     else 'load_reps'
   end
 where source is not null;

-- ---------------------------------------------------------------------------
-- Volume is a load × reps number, and now says so.
--
-- It always summed `weight_kg * reps`, which quietly did the right thing for
-- a treadmill (zero) and the wrong thing for a farmers walk (also zero,
-- despite 30kg having been carried). Neither is fixable by arithmetic —
-- kilometres do not convert into kilograms — so the filter states the
-- intention instead of arriving at it by accident.
-- ---------------------------------------------------------------------------
create or replace function public.volume_history(p_client_id uuid, p_weeks integer default 8)
returns table (week_start timestamptz, volume_kg numeric)
language sql
security definer
stable
set search_path = ''
as $$
  with weeks as (
    select generate_series(
      date_trunc('week', now()) - ((least(greatest(coalesce(p_weeks, 8), 1), 52) - 1) * interval '1 week'),
      date_trunc('week', now()),
      interval '1 week'
    ) as week_start
  )
  select
    w.week_start,
    coalesce((
      select sum(ws.weight_kg * ws.reps)
        from public.workout_sets ws
        join public.workout_exercises we on we.id = ws.workout_exercise_id
        join public.workout_sessions s on s.id = we.workout_session_id
        -- Left, not inner: an exercise somebody typed has no catalogue row,
        -- and dropping it would silently shrink their volume.
        left join public.exercises e on e.id = we.exercise_id
       where s.client_id = p_client_id
         and s.finished_at is not null
         and ws.completed
         and date_trunc('week', s.finished_at) = w.week_start
         -- Only the measures where a kilogram times a repetition means
         -- something. An unknown measure is treated as load × reps, which is
         -- what it was before this and what most things are.
         and coalesce(e.measure, 'load_reps') in ('load_reps', 'reps')
    ), 0)::numeric as volume_kg
  from weeks w
  order by w.week_start;
$$;

grant execute on function public.volume_history(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- And a record is a heaviest set, so it only applies where load is counted.
--
-- Without this a plank would hold a personal record of 0 kg, and a treadmill
-- session would too — both technically the heaviest they have ever been.
-- ---------------------------------------------------------------------------
create or replace function public.personal_records(p_client_id uuid, p_limit integer default 5)
returns table (name text, weight_kg numeric, reps integer, achieved_at timestamptz)
language sql
security definer
stable
set search_path = ''
as $$
  select distinct on (we.name)
    we.name,
    ws.weight_kg,
    ws.reps,
    s.finished_at as achieved_at
  from public.workout_sets ws
  join public.workout_exercises we on we.id = ws.workout_exercise_id
  join public.workout_sessions s on s.id = we.workout_session_id
  left join public.exercises e on e.id = we.exercise_id
 where s.client_id = p_client_id
   and s.finished_at is not null
   and ws.completed
   and ws.weight_kg > 0
   and coalesce(e.measure, 'load_reps') in ('load_reps', 'load_distance')
 order by we.name, ws.weight_kg desc, ws.reps desc, s.finished_at desc
 limit least(greatest(coalesce(p_limit, 5), 1), 50);
$$;

grant execute on function public.personal_records(uuid, integer) to authenticated;
