-- ---------------------------------------------------------------------------
-- Recording which catalogue entry a mid-workout lift came from.
--
-- `add_session_exercise` already takes a `p_exercise_id`, which reads like the
-- catalogue link and is not: it is the primary key the device generates for
-- the new `workout_exercises` row, so that an optimistic update and the saved
-- row agree on an id. A genuinely confusing name, and one this migration does
-- not rename — PostgREST resolves overloads by argument name, so renaming it
-- would break every client mid-deploy. It gets a comment instead.
--
-- The catalogue link is a new, defaulted argument, so nothing that already
-- calls this has to change on the same day the function does.
-- ---------------------------------------------------------------------------

drop function if exists public.add_session_exercise(uuid, uuid, text, jsonb);

create or replace function public.add_session_exercise(
  p_workout_session_id uuid,
  -- The id of the row being created, generated on the device. NOT a
  -- reference to public.exercises — that is p_catalogue_id below.
  p_exercise_id uuid,
  p_name text,
  p_sets jsonb,
  -- Which catalogue entry it was picked from, when it was picked from one.
  -- NULL for a lift somebody typed, which is a fact about the lift rather
  -- than a missing value.
  p_catalogue_id uuid default null
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
  insert into public.workout_exercises
    (id, workout_session_id, name, order_index, exercise_id)
  values (p_exercise_id, p_workout_session_id, btrim(p_name), v_next, p_catalogue_id);

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

comment on function public.add_session_exercise(uuid, uuid, text, jsonb, uuid) is
  'Adds one lift and its opening sets to a running workout, in one transaction.';

grant execute on function public.add_session_exercise(uuid, uuid, text, jsonb, uuid)
  to authenticated;
