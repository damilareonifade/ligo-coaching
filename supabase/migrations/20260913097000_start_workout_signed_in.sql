-- ---------------------------------------------------------------------------
-- `start_workout` assumed a caller.
--
-- Called without a session it ran all the way to inserting a workout with a
-- NULL client_id and came back as `null value in column "client_id" violates
-- not-null constraint`, quoting the whole failing row. Nothing was written —
-- the constraint held — but a not-null violation is not the reason, and it is
-- not something to put in front of a person whose session has expired.
--
-- The other verbs in 20260913092000 all fail their authorization check first
-- and say so; this makes the odd one out agree.
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
      (workout_session_id, name, coach_note, own_note, order_index)
    values (v_session_id, v_block.name, v_block.note, null, v_block.order_index)
    returning id into v_exercise_id;

    -- "4 × 8" is display text — the shape a coach types and a client reads —
    -- so the counts are read back out of it rather than stored twice.
    v_sets := coalesce(nullif(substring(v_block.scheme from '^\s*(\d+)'), '')::integer, 3);
    v_reps := coalesce(nullif(substring(v_block.scheme from '[×xX]\s*(\d+)'), '')::integer, 8);

    insert into public.workout_sets (workout_exercise_id, n, weight_kg, reps)
    select v_exercise_id, n, coalesce(v_block.target_kg, 0), v_reps
      from generate_series(1, greatest(v_sets, 1)) as n;
  end loop;

  return v_session_id;
end;
$$;
