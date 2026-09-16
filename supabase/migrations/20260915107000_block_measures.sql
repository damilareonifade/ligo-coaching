-- ---------------------------------------------------------------------------
-- Letting a coach prescribe something that is not sets × reps × kilograms.
--
-- `exercises.measure` and the two new columns on the block tables made room
-- for a treadmill and a plank in a *logged* session and in an import. They did
-- not reach the builder: it asks for Sets, Reps and kg whatever was picked, so
-- a coach adding Treadmill to a routine is asked how many reps of treadmill to
-- do, and offered a working weight for it.
--
-- Two things were missing underneath that. The save functions never accepted
-- the new columns — so even a builder that collected a distance had nowhere to
-- put it — and they never recorded which catalogue entry a block came from, so
-- a block could not look up how its exercise is measured. Both are added here.
--
-- `exercise_id` is the same link the session path already keeps: the name
-- stays the display text and stays editable, and the id underneath remembers
-- what it was chosen from.
-- ---------------------------------------------------------------------------

create or replace function public.save_routine(
  p_routine_id uuid,
  p_name text,
  p_note text,
  p_blocks jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := p_routine_id;
  v_client uuid := auth.uid();
begin
  if v_client is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception 'a routine needs a name' using errcode = '23514';
  end if;

  if v_id is null then
    insert into public.routine_instances (client_id, name, note, order_index)
    values (
      v_client,
      btrim(p_name),
      nullif(btrim(p_note), ''),
      coalesce(
        (select max(order_index) + 1 from public.routine_instances where client_id = v_client),
        0
      )
    )
    returning id into v_id;
  else
    update public.routine_instances
       set name = btrim(p_name),
           note = nullif(btrim(p_note), '')
     where id = v_id and client_id = v_client;

    if not found then
      raise exception 'that routine is not yours to edit' using errcode = '42501';
    end if;
  end if;

  -- Replaced wholesale rather than diffed: the app sends the routine as it now
  -- stands, and a block the coach deleted has to disappear.
  delete from public.routine_blocks where routine_instance_id = v_id;

  insert into public.routine_blocks
    (routine_instance_id, name, scheme, rpe, target_kg, note, order_index,
     exercise_id, target_distance_km, target_duration_seconds)
  select
    v_id,
    b.name,
    coalesce(nullif(btrim(b.scheme), ''), '3 × 10'),
    coalesce(b.rpe, ''),
    -- The app sends `null` for a bodyweight movement, but a stepper taken to
    -- the bottom sends 0, and `routine_blocks_target_positive` refuses it.
    -- Both mean the same thing: no target load.
    case when b.target_kg > 0 then b.target_kg end,
    nullif(btrim(b.note), ''),
    b.order_index,
    b.exercise_id,
    -- Same reasoning as the load: zero is the stepper's floor, not a distance
    -- anybody meant to prescribe.
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

  return v_id;
end;
$$;

grant execute on function public.save_routine(uuid, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- And the same three columns on the coach's side.
--
-- Only the block insert changes; everything around it — matching routines by
-- position so an assigned copy is not orphaned, dropping the ones the coach
-- removed — is as it was.
-- ---------------------------------------------------------------------------
create or replace function public.save_program_blocks(
  p_program_routine_id uuid,
  p_blocks jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.program_blocks where program_routine_id = p_program_routine_id;

  insert into public.program_blocks
    (program_routine_id, name, scheme, rpe, target_kg, note, order_index,
     exercise_id, target_distance_km, target_duration_seconds)
  select
    p_program_routine_id,
    b.name,
    coalesce(nullif(btrim(b.scheme), ''), '3 × 10'),
    coalesce(b.rpe, ''),
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
end;
$$;

comment on function public.save_program_blocks(uuid, jsonb) is
  'One routine day of blocks. Extracted so save_program has one insert, not two.';

-- ---------------------------------------------------------------------------
-- And save_program delegates to it.
-- ---------------------------------------------------------------------------
create or replace function public.save_program(
  p_name text,
  p_weeks integer,
  p_sessions_per_week integer,
  p_routines jsonb,
  p_note text default null,
  p_program_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_coach uuid := auth.uid();
  v_id uuid := p_program_id;
  v_routine record;
  v_routine_id uuid;
  v_count integer := jsonb_array_length(coalesce(p_routines, '[]'::jsonb));
begin
  if v_coach is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception 'a program needs a name' using errcode = '23514';
  end if;

  if v_id is null then
    -- `has_draft_changes` defaults true and `status` to 'draft': a program
    -- nobody has published is exactly that.
    insert into public.programs (coach_id, name, note, weeks, sessions_per_week)
    values (v_coach, btrim(p_name), p_note,
            least(greatest(coalesce(p_weeks, 8), 1), 52),
            least(greatest(coalesce(p_sessions_per_week, 4), 1), 7))
    returning id into v_id;
  else
    update public.programs
       set name = btrim(p_name),
           note = p_note,
           weeks = least(greatest(coalesce(p_weeks, 8), 1), 52),
           sessions_per_week = least(greatest(coalesce(p_sessions_per_week, 4), 1), 7),
           -- Ahead of what clients hold, including an edit to something
           -- already published.
           has_draft_changes = true
     where id = v_id and coach_id = v_coach;

    -- RLS makes another coach's program invisible rather than forbidden, so
    -- "no such program" and "not yours" arrive here as the same thing.
    if not found then
      raise exception 'that program is not yours to edit' using errcode = '42501';
    end if;
  end if;

  for v_routine in
    select *
      from jsonb_to_recordset(coalesce(p_routines, '[]'::jsonb))
        as r(name text, order_index integer, blocks jsonb)
     order by order_index
  loop
    select r.id into v_routine_id
      from public.program_routines r
     where r.program_id = v_id and r.order_index = v_routine.order_index;

    if v_routine_id is null then
      insert into public.program_routines (program_id, name, order_index)
      values (v_id, btrim(v_routine.name), v_routine.order_index)
      returning id into v_routine_id;
    else
      update public.program_routines
         set name = btrim(v_routine.name)
       where id = v_routine_id;
    end if;

    -- Blocks are replaced outright. Nothing points at a program_block — an
    -- assigned client holds a copy in routine_blocks — so there is no link to
    -- preserve, and the builder hands back the whole list anyway.
    -- One call rather than a second copy of the same insert. The helper is
    -- where the new columns — the catalogue link, a target distance, a target
    -- duration — are written, so the client's `save_routine` and this cannot
    -- drift into accepting different fields.
    perform public.save_program_blocks(v_routine_id, v_routine.blocks);

  end loop;

  -- Routines the coach dropped off the end. Copies already handed out survive
  -- as the client's own — `on delete set null`, not cascade — rather than
  -- disappearing from under someone mid-program.
  delete from public.program_routines
   where program_id = v_id and order_index >= v_count;

  return v_id;
end;
$$;

comment on function public.save_program(text, integer, integer, jsonb, text, uuid) is
  'Creates or rewrites a coach''s program, routines and exercises, in one transaction.';

grant execute on function public.save_program(text, integer, integer, jsonb, text, uuid)
  to authenticated;
