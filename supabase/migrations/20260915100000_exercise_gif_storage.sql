-- ---------------------------------------------------------------------------
-- Keeping the animations.
--
-- `gifUrl` from WorkoutX is not a CDN link — it is
-- https://api.workoutxapp.com/v1/gifs/0032, an authenticated endpoint on their
-- API that answers 401 without the key. So the URL we imported can never load
-- on a phone, and hotlinking is not an option at all: the device would have to
-- carry the API key, which is the one thing this whole design avoids. Every
-- view would also cost a request against the monthly quota, so twenty minutes
-- of browsing would spend several percent of the month on pictures.
--
-- The animation is therefore fetched once, server-side where the key lives,
-- and kept. `gif_path` is where it landed; the app builds the public URL from
-- it, so the host is not written into the database.
--
-- Fetched on first view rather than all 1,400 up front. The catalogue is a
-- long tail nobody will ever open in full, bench press is fetched once ever,
-- and a bulk download would cost 1,400 requests and some gigabytes to store
-- animations of exercises no coach in this gym has heard of.
-- ---------------------------------------------------------------------------

alter table public.exercises
  add column gif_path text;

comment on column public.exercises.gif_path is
  'Object path in the exercise-gifs bucket. NULL until somebody opens it once.';

-- ---------------------------------------------------------------------------
-- A public bucket, because an exercise animation is not a secret and a signed
-- URL per view would put an Edge Function in front of every image load.
--
-- Guarded: the throwaway Postgres the behavioural checks run against has no
-- `storage` schema, and the schema is the platform's rather than ours.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('exercise-gifs', 'exercise-gifs', true, 8388608, array['image/gif', 'image/webp'])
    on conflict (id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- The preview now hands back the stored path rather than the API's URL.
--
-- Returning the path and not a full URL keeps the project's hostname out of
-- the database — the app already knows where its own Supabase lives, and a
-- host baked into rows is a host that is wrong after a migration.
-- ---------------------------------------------------------------------------
drop function if exists public.exercise_preview(uuid, text);

create or replace function public.exercise_preview(
  p_exercise_id uuid default null,
  p_name text default null
)
returns table (
  id uuid,
  name text,
  gif_path text,
  external_id text,
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
  select e.id, e.name, e.gif_path,
         -- Returned so the app can ask for the animation to be fetched. An
         -- authored exercise has none, which is how the app knows not to ask.
         e.external_id,
         e.body_part, e.target, e.equipment,
         e.secondary_muscles, e.instructions, e.difficulty
    from public.exercises e
   where e.owner_id is null
     and (
       (p_exercise_id is not null and e.id = p_exercise_id)
       or (p_exercise_id is null and p_name is not null
           and lower(btrim(e.name)) = lower(btrim(p_name)))
     )
   limit 1;
$$;

comment on function public.exercise_preview(uuid, text) is
  'The catalogue entry behind a block. By id, falling back to an exact name.';

grant execute on function public.exercise_preview(uuid, text) to authenticated;
