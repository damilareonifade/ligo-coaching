-- ---------------------------------------------------------------------------
-- Writing the rule out exposed three more of the bug it was meant to fix.
--
-- `guess_exercise_measure` tested `body_part = 'cardio'` before it tested for
-- body-weight equipment. The dataset files burpees, mountain climbers,
-- jumping jacks and high knees under cardio, so all of them came out as
-- distance and duration — and the builder asked a coach how many kilometres
-- of burpees to prescribe. Same shape of error as the kilograms it was offering
-- for battling ropes, one rule further down.
--
-- The ordering is now the thing it should always have been: **distance is only
-- claimed when something actually measures distance.** A treadmill, a bike and
-- an ergometer do. A sled dragged across a floor does. A body on a mat does
-- not, whatever the dataset files it under — so body-weight equipment is
-- settled before the body part is consulted at all, and lands on reps, which
-- is never nonsensical even where time would have read better.
--
-- The holds still come first among the body-weight movements, because a plank
-- is a plank whatever its equipment column says.
-- ---------------------------------------------------------------------------
create or replace function public.guess_exercise_measure(
  p_name text,
  p_body_part text,
  p_equipment text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    -- 1. Machines that measure ground covered. Named individually rather than
    -- by body part, because several are filed under the limb they work.
    when coalesce(p_equipment, '') ~*
      '(treadmill|elliptical|stationary bike|bicycle|skierg|stepmill|ergometer|rowing)'
      then 'distance_duration'

    -- 2. Dragged, pushed or carried: loaded, and measured in ground covered.
    when coalesce(p_equipment, '') ~* 'sled'
      or coalesce(p_name, '') ~* '(farmer|suitcase carry|yoke|sled)'
      then 'load_distance'

    -- 3. Thrashed, swung or skipped for time. There is no rep to count in a
    -- thirty-second rope set, and no weight on the end of it either. Matched
    -- on equipment, not the name, so a cable rope pushdown stays load × reps.
    when coalesce(p_equipment, '') ~* '(rope|tire|tyre)'
      or coalesce(p_name, '') ~* '(batt?ling rope|battle rope|jump rope|skipping)'
      then 'duration'

    -- 4. Held rather than repeated. Before the body-weight rule below, since
    -- almost every hold is a body-weight movement.
    when coalesce(p_name, '') ~*
      '(plank|dead hang|wall sit|l-sit|isometric|hollow hold|superman hold|hold$|hang$)'
      then 'duration'

    -- 5. The load is the body, so there is none to prescribe — and there is no
    -- distance either, which is the whole reason this now sits above cardio.
    when coalesce(p_equipment, '') ~* '(body ?weight|assisted)' then 'reps'

    -- 6. Anything else the dataset calls cardio is a machine of some kind.
    when lower(coalesce(p_body_part, '')) = 'cardio' then 'distance_duration'

    else 'load_reps'
  end;
$$;

-- Re-guess what is already imported, now that the order is right. Blocks read
-- their measure through `exercise_id`, so every routine already built picks
-- the correction up on its next read.
update public.exercises
   set measure = public.guess_exercise_measure(name, body_part, equipment)
 where source is not null;
