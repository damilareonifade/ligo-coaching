-- ---------------------------------------------------------------------------
-- Saving a program the coach is building.
--
-- A program is a row, its routines, and every exercise inside each of them —
-- so a save is one transaction or it is a program half-written. That is the
-- same argument as `save_routine`, and this is the coach's side of it.
--
-- The part worth reading twice is how routines are matched. The builder holds
-- them as an ordered list and mints positional ids of its own ("routine-2"),
-- which are not the database's, so they cannot be matched by id. They are
-- matched by **position** instead, and the row is kept rather than replaced.
-- That matters far beyond tidiness: every client holding a copy points at
-- `program_routines.id`, and deleting the row to insert an identical one would
-- quietly cut all of them loose from the template — no future publish would
-- ever reach them again.
--
-- A save is never a publish. Every write lands as a draft change and waits for
-- the coach to send it out, which is the promise the library screen makes.
--
-- `security invoker`: `programs_all_own` and the policies hanging off it
-- already say a coach may only touch their own, so there is nothing to
-- re-implement. The function exists for atomicity, not for privilege.
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
    delete from public.program_blocks where program_routine_id = v_routine_id;

    insert into public.program_blocks
      (program_routine_id, name, scheme, rpe, target_kg, note, order_index)
    select
      v_routine_id,
      b.name,
      coalesce(nullif(btrim(b.scheme), ''), '3 × 10'),
      coalesce(b.rpe, ''),
      -- Null for a bodyweight movement; a stepper taken to the bottom sends 0,
      -- which `program_blocks_target_positive` refuses and which means the
      -- same thing.
      case when b.target_kg > 0 then b.target_kg end,
      nullif(btrim(b.note), ''),
      b.order_index
    from jsonb_to_recordset(coalesce(v_routine.blocks, '[]'::jsonb)) as b(
      name text,
      scheme text,
      rpe text,
      target_kg numeric,
      note text,
      order_index integer
    );
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
