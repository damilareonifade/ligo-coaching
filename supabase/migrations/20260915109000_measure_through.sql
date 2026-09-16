-- ---------------------------------------------------------------------------
-- Carrying a measure the whole way.
--
-- The two save functions now accept `exercise_id`, `target_distance_km` and
-- `target_duration_seconds`, so a coach can write "run 5km in 30 minutes".
-- Every path that *copies* a block still drops all three, which makes the
-- builder a promise the rest of the system does not keep:
--
--   `assign_program` copies program_blocks → routine_blocks. The client's copy
--   of the treadmill arrives with no distance and no catalogue link.
--
--   `publish_program` writes routine_update_blocks, a table that has no such
--   columns at all — and its "has anything changed" test compares name, scheme
--   and target_kg only, so changing a run from 3km to 5km looks like no change
--   and no client is asked.
--
--   `decide_routine_update` copies the accepted proposal back, dropping them a
--   second time.
--
--   `start_workout` reads the scheme for a set count and a rep count and seeds
--   every set with weight × reps. A 5km run opened as three sets of eight reps
--   at zero kilograms, which is not a wrong number so much as the wrong
--   question repeated three times.
--
-- All four are fixed here. Nothing about load × reps changes: every branch
-- added below is reached only by an exercise that says it is measured
-- otherwise.
-- ---------------------------------------------------------------------------

-- The proposal table, brought level with the two it sits between. Without
-- these an accepted update is a silent downgrade of the client's copy.
alter table public.routine_update_blocks
  add column exercise_id uuid references public.exercises (id) on delete set null,
  add column target_distance_km numeric(7, 3),
  add column target_duration_seconds integer;

-- ---------------------------------------------------------------------------
-- How a block is measured.
--
-- The catalogue is the authority when the block was picked from it. When it
-- was typed by hand there is no row to ask, so the prescription answers for
-- itself: a block carrying a distance is measured in distance whatever its
-- name says. `load_reps` last, because that is what almost everything is and
-- what every block written before any of this existed meant.
-- ---------------------------------------------------------------------------
create or replace function public.measure_for_block(
  p_exercise_id uuid,
  p_target_kg numeric,
  p_target_distance_km numeric,
  p_target_duration_seconds integer
)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select e.measure from public.exercises e where e.id = p_exercise_id),
    case
      when p_target_distance_km is not null and coalesce(p_target_kg, 0) > 0 then 'load_distance'
      when p_target_distance_km is not null then 'distance_duration'
      when p_target_duration_seconds is not null then 'duration'
      else 'load_reps'
    end
  );
$$;

comment on function public.measure_for_block(uuid, numeric, numeric, integer) is
  'How a prescribed block is counted: the catalogue if it is linked, else what the targets imply.';

grant execute on function public.measure_for_block(uuid, numeric, numeric, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Assignment. Only the block copy changes.
-- ---------------------------------------------------------------------------
create or replace function public.assign_program(
  p_program_id uuid,
  p_client_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coach uuid := auth.uid();
  v_client uuid;
  v_routine record;
  v_instance_id uuid;
  v_created integer := 0;
begin
  if not exists (
    select 1 from public.programs p
     where p.id = p_program_id and p.coach_id = v_coach
  ) then
    raise exception 'that program is not yours to assign' using errcode = '42501';
  end if;

  foreach v_client in array coalesce(p_client_ids, '{}'::uuid[]) loop
    -- The link is the authority. A coach cannot hand a program to someone who
    -- has not accepted them.
    if not exists (
      select 1 from public.coach_clients cc
       where cc.coach_id = v_coach
         and cc.client_id = v_client
         and cc.status = 'active'
    ) then
      raise exception 'no active link to that client' using errcode = '42501';
    end if;

    for v_routine in
      select r.id, r.name, r.order_index
        from public.program_routines r
       where r.program_id = p_program_id
       order by r.order_index
    loop
      continue when exists (
        select 1 from public.routine_instances i
         where i.client_id = v_client and i.program_routine_id = v_routine.id
      );

      insert into public.routine_instances
        (client_id, program_routine_id, coach_id, name, note, order_index, base_version)
      select
        v_client,
        v_routine.id,
        v_coach,
        case when (select count(*) from public.program_routines pr
                    where pr.program_id = p_program_id) > 1
             then p.name || ' · ' || v_routine.name
             else p.name
        end,
        p.note,
        v_routine.order_index,
        p.version
        from public.programs p
       where p.id = p_program_id
      returning id into v_instance_id;

      -- Copied, not shared: a later edit on either side moves only this row.
      -- The catalogue link comes along, because how an exercise is measured is
      -- not something the copy should have to guess at.
      insert into public.routine_blocks
        (routine_instance_id, name, scheme, rpe, target_kg, note, order_index,
         exercise_id, target_distance_km, target_duration_seconds)
      select v_instance_id, b.name, b.scheme, b.rpe, b.target_kg, b.note, b.order_index,
             b.exercise_id, b.target_distance_km, b.target_duration_seconds
        from public.program_blocks b
       where b.program_routine_id = v_routine.id
       order by b.order_index;

      v_created := v_created + 1;
    end loop;
  end loop;

  return v_created;
end;
$$;

grant execute on function public.assign_program(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Publishing. Two changes: what counts as a change, and what gets proposed.
-- ---------------------------------------------------------------------------
create or replace function public.publish_program(p_program_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
  v_instance record;
  v_update_id uuid;
  v_summary text;
  v_asked integer := 0;
begin
  if not exists (
    select 1 from public.programs p
     where p.id = p_program_id and p.coach_id = auth.uid()
  ) then
    raise exception 'that program is not yours to publish' using errcode = '42501';
  end if;

  update public.programs
     set version = version + 1,
         status = 'published',
         has_draft_changes = false
   where id = p_program_id
  returning version into v_version;

  for v_instance in
    select i.id as instance_id, i.program_routine_id
      from public.routine_instances i
      join public.program_routines r on r.id = i.program_routine_id
     where r.program_id = p_program_id
  loop
    -- What changed, in words. Names whose prescription moved, plus anything
    -- newly added — enough for a client to recognise the change without
    -- opening it.
    --
    -- The distance and the hold are part of the prescription, so a run taken
    -- from 3km to 5km is a change. Left out, it read as identical and the
    -- client was never asked.
    select string_agg(b.name, ', ' order by b.order_index)
      into v_summary
      from public.program_blocks b
     where b.program_routine_id = v_instance.program_routine_id
       and not exists (
         select 1 from public.routine_blocks rb
          where rb.routine_instance_id = v_instance.instance_id
            and rb.name = b.name
            and rb.scheme = b.scheme
            and rb.target_kg is not distinct from b.target_kg
            and rb.target_distance_km is not distinct from b.target_distance_km
            and rb.target_duration_seconds is not distinct from b.target_duration_seconds
       );

    -- One proposal per copy: a second publish replaces the first rather than
    -- queueing, because nobody wants to answer a backlog.
    delete from public.routine_updates where routine_instance_id = v_instance.instance_id;

    insert into public.routine_updates (routine_instance_id, template_version, summary)
    values (v_instance.instance_id, v_version, coalesce(v_summary, 'Small changes'))
    returning id into v_update_id;

    insert into public.routine_update_blocks
      (routine_update_id, name, scheme, rpe, target_kg, note, order_index,
       exercise_id, target_distance_km, target_duration_seconds)
    select v_update_id, b.name, b.scheme, b.rpe, b.target_kg, b.note, b.order_index,
           b.exercise_id, b.target_distance_km, b.target_duration_seconds
      from public.program_blocks b
     where b.program_routine_id = v_instance.program_routine_id
     order by b.order_index;

    v_asked := v_asked + 1;
  end loop;

  return v_asked;
end;
$$;

grant execute on function public.publish_program(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Accepting a proposal. The third copy, and the last one that dropped them.
-- ---------------------------------------------------------------------------
create or replace function public.decide_routine_update(
  p_routine_instance_id uuid,
  p_accept boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_update record;
begin
  if not exists (
    select 1 from public.routine_instances i
     where i.id = p_routine_instance_id and i.client_id = auth.uid()
  ) then
    raise exception 'that routine is not yours to answer for' using errcode = '42501';
  end if;

  select id, template_version into v_update
    from public.routine_updates
   where routine_instance_id = p_routine_instance_id;

  if v_update.id is null then
    return false;
  end if;

  if p_accept then
    delete from public.routine_blocks where routine_instance_id = p_routine_instance_id;

    insert into public.routine_blocks
      (routine_instance_id, name, scheme, rpe, target_kg, note, order_index,
       exercise_id, target_distance_km, target_duration_seconds)
    select p_routine_instance_id, b.name, b.scheme, b.rpe, b.target_kg, b.note, b.order_index,
           b.exercise_id, b.target_distance_km, b.target_duration_seconds
      from public.routine_update_blocks b
     where b.routine_update_id = v_update.id
     order by b.order_index;

    update public.routine_instances
       set base_version = v_update.template_version,
           diverged = false
     where id = p_routine_instance_id;
  else
    update public.routine_instances
       set diverged = true
     where id = p_routine_instance_id;
  end if;

  delete from public.routine_updates where id = v_update.id;
  return true;
end;
$$;

grant execute on function public.decide_routine_update(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Starting a workout, in the terms the exercise is actually counted in.
--
-- The set count still comes off the scheme, because that is where a coach
-- wrote it. What each set *holds* now follows the measure:
--
--   distance_duration   one set. A 5km run is one effort, and three of them
--                       is not what anybody prescribed.
--   duration            sets × a hold. No reps.
--   load_distance       sets × load over a distance. No reps.
--   reps                sets × reps, no load. Nothing is loaded.
--   load_reps           exactly as before.
--
-- The catalogue link comes across onto the exercise too — the session screen
-- already reads it for the preview, and a routine-started exercise was the one
-- path that never set it.
-- ---------------------------------------------------------------------------
create or replace function public.start_workout(
  p_routine_instance_id uuid default null,
  p_title text default 'Quick workout'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client uuid := auth.uid();
  v_session_id uuid;
  v_block record;
  v_exercise_id uuid;
  v_sets integer;
  v_reps integer;
  v_measure text;
begin
  if v_client is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  if p_routine_instance_id is not null and not exists (
    select 1 from public.routine_instances i
     where i.id = p_routine_instance_id and i.client_id = v_client
  ) then
    raise exception 'that routine is not yours to start' using errcode = '42501';
  end if;

  insert into public.workout_sessions (client_id, routine_instance_id, title)
  select
    v_client,
    p_routine_instance_id,
    coalesce((select i.name from public.routine_instances i
               where i.id = p_routine_instance_id), p_title, 'Quick workout')
  returning id into v_session_id;

  for v_block in
    select b.* from public.routine_blocks b
     where b.routine_instance_id = p_routine_instance_id
     order by b.order_index
  loop
    insert into public.workout_exercises
      (workout_session_id, name, coach_note, own_note, order_index, exercise_id)
    values (v_session_id, v_block.name, v_block.note, null, v_block.order_index,
            v_block.exercise_id)
    returning id into v_exercise_id;

    -- "4 × 8" is display text — the shape a coach types and a client reads —
    -- so the counts are read back out of it rather than stored twice.
    v_sets := coalesce(nullif(substring(v_block.scheme from '^\s*(\d+)'), '')::integer, 3);
    v_reps := coalesce(nullif(substring(v_block.scheme from '[×xX]\s*(\d+)'), '')::integer, 8);

    v_measure := public.measure_for_block(
      v_block.exercise_id,
      v_block.target_kg,
      v_block.target_distance_km,
      v_block.target_duration_seconds
    );

    if v_measure = 'distance_duration' then
      insert into public.workout_sets
        (workout_exercise_id, n, weight_kg, reps, distance_km, duration_seconds)
      values (v_exercise_id, 1, 0, 0,
              v_block.target_distance_km, v_block.target_duration_seconds);

    elsif v_measure = 'duration' then
      -- A scheme of "3 × 45s" carries the hold where reps would be, so it is
      -- the fallback when no explicit target was set.
      insert into public.workout_sets
        (workout_exercise_id, n, weight_kg, reps, duration_seconds)
      select v_exercise_id, n, 0, 0,
             coalesce(v_block.target_duration_seconds, nullif(v_reps, 0))
        from generate_series(1, greatest(v_sets, 1)) as n;

    elsif v_measure = 'load_distance' then
      insert into public.workout_sets
        (workout_exercise_id, n, weight_kg, reps, distance_km)
      select v_exercise_id, n, coalesce(v_block.target_kg, 0), 0,
             v_block.target_distance_km
        from generate_series(1, greatest(v_sets, 1)) as n;

    elsif v_measure = 'reps' then
      insert into public.workout_sets (workout_exercise_id, n, weight_kg, reps)
      select v_exercise_id, n, 0, v_reps
        from generate_series(1, greatest(v_sets, 1)) as n;

    else
      insert into public.workout_sets (workout_exercise_id, n, weight_kg, reps)
      select v_exercise_id, n, coalesce(v_block.target_kg, 0), v_reps
        from generate_series(1, greatest(v_sets, 1)) as n;
    end if;
  end loop;

  return v_session_id;
end;
$$;

grant execute on function public.start_workout(uuid, text) to authenticated;
