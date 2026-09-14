-- ---------------------------------------------------------------------------
-- What the picker can filter by.
--
-- Read from the catalogue rather than written into the app, because the
-- vocabulary is WorkoutX's and not ours: "Upper Legs" and "Waist" are their
-- body parts, "Ez Barbell" and "Smith Machine" their equipment. A hardcoded
-- list would be a second opinion that drifts the first time they add one.
--
-- Counted as well as listed, so an option that would return nothing is never
-- offered — a filter chip that empties the screen is a chip nobody taps twice.
-- ---------------------------------------------------------------------------
create or replace function public.exercise_filter_options()
returns table (
  kind text,
  value text,
  label text,
  count integer
)
language sql
security definer
stable
set search_path = ''
as $$
  select 'body_part' as kind,
         e.body_part as value,
         initcap(e.body_part) as label,
         count(*)::integer as count
    from public.exercises e
   where e.owner_id is null and e.body_part is not null
   group by e.body_part

  union all

  select 'equipment',
         e.equipment,
         initcap(e.equipment),
         count(*)::integer
    from public.exercises e
   where e.owner_id is null and e.equipment is not null
   group by e.equipment

  order by 1, 4 desc, 3;
$$;

comment on function public.exercise_filter_options() is
  'The muscle groups and equipment the catalogue actually contains, with counts.';

grant execute on function public.exercise_filter_options() to authenticated;
