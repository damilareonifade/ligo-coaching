-- ---------------------------------------------------------------------------
-- Remembering which catalogue entry a block came from.
--
-- Every table that records an exercise records its *name* and nothing else:
-- `program_blocks.name`, `routine_blocks.name`, `workout_exercises.name`. That
-- was right while the name was all there was — a coach typed "Bench press" and
-- the app had nothing else to say about it.
--
-- Now there is a catalogue with an animated preview, target muscles and
-- instructions, and the most valuable place to show it is mid-workout: a
-- client on the gym floor reading "Chest-supported row" with no idea what that
-- is. Matching the stored name back to a catalogue row nearly works, and
-- "nearly" is the problem — "Bench press (paused)" matches nothing, and the
-- preview would be silently absent with no way to tell that from a movement
-- that simply has no GIF.
--
-- So the link is recorded rather than inferred. The name stays as the display
-- text and stays editable — a coach renaming their copy is a normal thing to
-- do — and the id underneath remembers what it was chosen from.
--
-- Nullable on purpose: an exercise somebody invented has no catalogue entry,
-- and that is a fact about the exercise rather than a row that is missing
-- something. `on delete set null` for the same reason — if a catalogue entry
-- goes away, the block keeps its name and loses only the preview.
-- ---------------------------------------------------------------------------

alter table public.program_blocks
  add column exercise_id uuid references public.exercises (id) on delete set null;

alter table public.routine_blocks
  add column exercise_id uuid references public.exercises (id) on delete set null;

alter table public.workout_exercises
  add column exercise_id uuid references public.exercises (id) on delete set null;

comment on column public.routine_blocks.exercise_id is
  'The catalogue entry this came from, for the preview. NULL when invented.';

-- ---------------------------------------------------------------------------
-- One backfill, by name, for everything written before this.
--
-- Exact and case-insensitive: a fuzzy match here would attach the wrong
-- animation to somebody's lift, which is worse than attaching none. Anything
-- that does not match keeps a NULL and simply has no preview.
-- ---------------------------------------------------------------------------
update public.program_blocks b
   set exercise_id = e.id
  from public.exercises e
 where e.owner_id is null
   and lower(btrim(e.name)) = lower(btrim(b.name))
   and b.exercise_id is null;

update public.routine_blocks b
   set exercise_id = e.id
  from public.exercises e
 where e.owner_id is null
   and lower(btrim(e.name)) = lower(btrim(b.name))
   and b.exercise_id is null;

update public.workout_exercises w
   set exercise_id = e.id
  from public.exercises e
 where e.owner_id is null
   and lower(btrim(e.name)) = lower(btrim(w.name))
   and w.exercise_id is null;

-- ---------------------------------------------------------------------------
-- What the preview needs, in one read.
--
-- A `security definer` function rather than a view with a join at every call
-- site: the app asks "what is this exercise" from four screens, and each of
-- them holds a block id or a name, not a catalogue id.
--
-- Definer because the catalogue is shared and readable by everyone — there is
-- nothing here to scope — while the *name* fallback has to look at rows the
-- caller may not otherwise be entitled to read.
-- ---------------------------------------------------------------------------
create or replace function public.exercise_preview(
  p_exercise_id uuid default null,
  p_name text default null
)
returns table (
  id uuid,
  name text,
  gif_url text,
  body_part text,
  target text,
  equipment text,
  secondary_muscles text[],
  instructions text[],
  difficulty text
)
language sql
security definer
stable
set search_path = ''
as $$
  select e.id, e.name, e.gif_url, e.body_part, e.target, e.equipment,
         e.secondary_muscles, e.instructions, e.difficulty
    from public.exercises e
   where e.owner_id is null
     and (
       -- The recorded link first. The name is only consulted for rows written
       -- before this migration, or typed rather than picked.
       (p_exercise_id is not null and e.id = p_exercise_id)
       or (p_exercise_id is null and p_name is not null
           and lower(btrim(e.name)) = lower(btrim(p_name)))
     )
   limit 1;
$$;

comment on function public.exercise_preview(uuid, text) is
  'The catalogue entry behind a block. By id, falling back to an exact name.';

grant execute on function public.exercise_preview(uuid, text) to authenticated;
