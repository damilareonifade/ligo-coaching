-- ---------------------------------------------------------------------------
-- The fourth write path.
--
-- `save_routine`, `save_program_blocks`, `assign_program`, `publish_program`
-- and `decide_routine_update` all carry the catalogue link and the two new
-- targets now. `save_client_routine` — a coach editing one client's copy —
-- does not, and it replaces the blocks wholesale like every other save here.
--
-- So a coach opening a client's routine to fix a typo and pressing Save would
-- silently blank the distance on their treadmill and the hold on their plank.
-- Nothing would error; the prescription would just quietly become three sets
-- of ten of something that has neither sets nor reps.
--
-- Signature unchanged, parameters named exactly as before: PostgREST resolves
-- overloads by argument name, and renaming one here would create a second
-- function rather than replace this one.
-- ---------------------------------------------------------------------------
create or replace function public.save_client_routine(
  p_routine_instance_id uuid,
  p_name text,
  p_blocks jsonb,
  p_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_coach uuid := auth.uid();
begin
  if v_coach is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception 'a routine needs a name' using errcode = '23514';
  end if;

  update public.routine_instances
     set name = btrim(p_name),
         note = p_note,
         -- A coach's edit moves the copy away from the template just as the
         -- client's own would. Divergence is a fact about the copy, not about
         -- who typed it — and it is what the coach's next publish collides
         -- with, so it has to be true whoever made the change.
         diverged = true
   where id = p_routine_instance_id;

  -- RLS refuses a copy this coach did not assign, and one the client built for
  -- themselves, by making the row invisible rather than forbidden — so "no
  -- such routine" and "not yours" arrive here as the same thing.
  if not found then
    raise exception 'that routine is not yours to edit' using errcode = '42501';
  end if;

  delete from public.routine_blocks where routine_instance_id = p_routine_instance_id;

  insert into public.routine_blocks
    (routine_instance_id, name, scheme, rpe, target_kg, note, order_index,
     exercise_id, target_distance_km, target_duration_seconds)
  select
    p_routine_instance_id,
    b.name,
    coalesce(nullif(btrim(b.scheme), ''), '3 × 10'),
    coalesce(b.rpe, ''),
    -- Null for a bodyweight movement; a stepper taken to the bottom sends 0,
    -- which `routine_blocks_target_positive` refuses and which means the same.
    -- The two below follow the same rule: zero is the floor, not a target.
    case when b.target_kg > 0 then b.target_kg end,
    nullif(btrim(b.note), ''),
    b.order_index,
    b.exercise_id,
    case when b.target_distance_km > 0 then b.target_distance_km end,
    case when b.target_duration_seconds > 0 then b.target_duration_seconds end
  from jsonb_to_recordset(coalesce(p_blocks, '[]'::jsonb)) as b(
    name text,
    scheme text,
    rpe text,
    target_kg numeric,
    note text,
    order_index integer,
    exercise_id uuid,
    target_distance_km numeric,
    target_duration_seconds integer
  );

  return p_routine_instance_id;
end;
$$;

grant execute on function public.save_client_routine(uuid, text, jsonb, text) to authenticated;
