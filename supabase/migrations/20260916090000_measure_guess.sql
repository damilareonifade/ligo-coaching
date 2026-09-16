-- ---------------------------------------------------------------------------
-- The measure guess was too crude, and it only ever ran once.
--
-- `20260915106000` set `exercises.measure` with a two-line rule: body part
-- 'cardio' meant distance and duration, body-weight equipment meant reps, and
-- everything else meant load × reps. Two things were wrong with it.
--
--   It was a one-off UPDATE. The catalogue sync inserts rows without touching
--   `measure`, so every exercise added by a later sync arrives at the column
--   default — load × reps — whatever it actually is. The guess needs to be a
--   trigger, not a migration that has already run.
--
--   It missed everything conditioning that is not filed under cardio. Battling
--   ropes came through as load × reps and the builder offered a coach a working
--   weight in kilograms for it. So did sleds, tyres and the ergometers. The
--   dataset files these by their equipment, not their body part.
--
-- The rule below keys on equipment first, because that is what the dataset is
-- consistent about, then on the name for the holds — a plank is a plank
-- whatever it is filed under. `load_reps` stays the last resort, because it is
-- what most things are.
--
-- Still a guess, and still said to be one. A coach cannot correct a wrong
-- answer yet; when they can, `guess_exercise_measure` is what it overrules.
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
    -- Machines you cover ground on. Named individually rather than by body
    -- part, because several are filed under the limb they work.
    when coalesce(p_equipment, '') ~*
      '(treadmill|elliptical|stationary bike|bicycle|skierg|stepmill|ergometer|rowing)'
      then 'distance_duration'

    -- Dragged, pushed or carried: loaded, and measured in ground covered.
    when coalesce(p_equipment, '') ~* 'sled'
      or coalesce(p_name, '') ~* '(farmer|suitcase carry|yoke|sled)'
      then 'load_distance'

    -- Thrashed, swung or skipped for time. There is no rep to count in a
    -- thirty-second rope set, and no weight on the end of it either.
    when coalesce(p_equipment, '') ~* '(rope|tire|tyre)'
      or coalesce(p_name, '') ~* '(batt?ling rope|battle rope|jump rope|skipping)'
      then 'duration'

    -- Held rather than repeated.
    when coalesce(p_name, '') ~*
      '(plank|dead hang|wall sit|l-sit|isometric|hollow hold|superman hold|hold$|hang$)'
      then 'duration'

    -- Anything else the dataset calls cardio.
    when lower(coalesce(p_body_part, '')) = 'cardio' then 'distance_duration'

    -- The load is the body, so there is none to prescribe.
    when coalesce(p_equipment, '') ~* '(body ?weight|assisted)' then 'reps'

    else 'load_reps'
  end;
$$;

comment on function public.guess_exercise_measure(text, text, text) is
  'Opening guess at how an imported exercise is counted. Overruled by an explicit measure, never the other way round.';

-- ---------------------------------------------------------------------------
-- Applied on every write, so a later sync cannot reintroduce the default.
--
-- Folded into the trigger that already composes an imported row's presentation
-- fields: same guard (`source is not null`), same moment, one less trigger to
-- reason about.
--
-- Only fills in the default. A row whose measure already says something else
-- is a row somebody or something has answered for, and the guess does not get
-- to overrule an answer — which is what makes a coach-facing override
-- possible later without touching this.
-- ---------------------------------------------------------------------------
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

  if new.measure is null or new.measure = 'load_reps' then
    new.measure := public.guess_exercise_measure(new.name, new.body_part, new.equipment);
  end if;

  return new;
end;
$$;

-- And over what is already imported. A block reads its measure through
-- `exercise_id`, so every routine and program already built picks the
-- corrected answer up on its next read — no block needs rewriting.
--
-- The scheme text a coach saved does not move: a battling-ropes block that
-- says "3 × 10" keeps saying so until it is next edited, at which point the
-- fields it is edited with are the right ones.
update public.exercises
   set measure = public.guess_exercise_measure(name, body_part, equipment)
 where source is not null;
