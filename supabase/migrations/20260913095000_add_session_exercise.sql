-- ---------------------------------------------------------------------------
-- Adding a lift partway through a workout.
--
-- Three things have to happen together: the exercise row, its opening sets,
-- and its place in the order. Done from the phone that is a read for the next
-- order_index, an insert, and an insert — and the failure in the middle leaves
-- an exercise with no sets under it, or two exercises claiming the same
-- position. Neither is something to hand a person mid-session.
--
-- The id comes from the caller. The phone mints it so the optimistic card, the
-- draft store and the row the sets are written against all agree from the
-- first frame — see `newSessionExercise`.
--
-- `security invoker`: the policies on workout_exercises and workout_sets
-- already say the session must be the caller's, so there is no authorization
-- to restate here. The function exists for atomicity, not for privilege.
-- ---------------------------------------------------------------------------
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

  -- No coach_note: nobody prescribed this one.
  insert into public.workout_exercises (id, workout_session_id, name, order_index)
  values (p_exercise_id, p_workout_session_id, btrim(p_name), v_next);

  insert into public.workout_sets (workout_exercise_id, n, weight_kg, reps, completed, is_pr)
  select
    p_exercise_id,
    s.n,
    coalesce(s.weight_kg, 0),
    coalesce(s.reps, 0),
    coalesce(s.completed, false),
    coalesce(s.is_pr, false)
  from jsonb_to_recordset(coalesce(p_sets, '[]'::jsonb)) as s(
    n integer,
    weight_kg numeric,
    reps integer,
    completed boolean,
    is_pr boolean
  );
end;
$$;

comment on function public.add_session_exercise(uuid, uuid, text, jsonb) is
  'Adds one lift and its opening sets to a running workout, in one transaction.';

grant execute on function public.add_session_exercise(uuid, uuid, text, jsonb) to authenticated;
