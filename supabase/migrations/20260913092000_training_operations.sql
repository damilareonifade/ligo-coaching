-- ---------------------------------------------------------------------------
-- The verbs.
--
-- Assigning, publishing, answering a proposal and starting a workout are each
-- many rows that have to land together or not at all. Done as separate inserts
-- from a phone they would half-apply on a dropped connection and leave a
-- client holding three routines out of four, or a proposal with no blocks.
--
-- `security definer` because each one reads or writes rows the caller cannot
-- reach directly — a coach writing into a client's routine, a publish touching
-- every holder. That means RLS is bypassed inside, so every function checks
-- its own authorization first and does so against public.coach_clients, the
-- one place that answers who may touch whom.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Assignment copies. That single choice is what makes "change it for this
-- client only" expressible, and what lets a client's edit reach their coach
-- without leaking into anyone else's copy.
--
-- Idempotent: a client who already holds a routine is skipped rather than
-- given a second copy, so assigning twice is harmless.
-- ---------------------------------------------------------------------------
create or replace function public.assign_program(
  p_program_id uuid,
  p_client_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coach uuid := auth.uid();
  v_client uuid;
  v_routine record;
  v_instance_id uuid;
  v_created integer := 0;
begin
  if not exists (
    select 1 from public.programs p
     where p.id = p_program_id and p.coach_id = v_coach
  ) then
    raise exception 'that program is not yours to assign' using errcode = '42501';
  end if;

  foreach v_client in array coalesce(p_client_ids, '{}'::uuid[]) loop
    -- The link is the authority. A coach cannot hand a program to someone who
    -- has not accepted them.
    if not exists (
      select 1 from public.coach_clients cc
       where cc.coach_id = v_coach
         and cc.client_id = v_client
         and cc.status = 'active'
    ) then
      raise exception 'no active link to that client' using errcode = '42501';
    end if;

    for v_routine in
      select r.id, r.name, r.order_index
        from public.program_routines r
       where r.program_id = p_program_id
       order by r.order_index
    loop
      continue when exists (
        select 1 from public.routine_instances i
         where i.client_id = v_client and i.program_routine_id = v_routine.id
      );

      insert into public.routine_instances
        (client_id, program_routine_id, coach_id, name, note, order_index, base_version)
      select
        v_client,
        v_routine.id,
        v_coach,
        case when (select count(*) from public.program_routines pr
                    where pr.program_id = p_program_id) > 1
             then p.name || ' · ' || v_routine.name
             else p.name
        end,
        p.note,
        v_routine.order_index,
        p.version
        from public.programs p
       where p.id = p_program_id
      returning id into v_instance_id;

      -- Copied, not shared: a later edit on either side moves only this row.
      insert into public.routine_blocks
        (routine_instance_id, name, scheme, rpe, target_kg, note, order_index)
      select v_instance_id, b.name, b.scheme, b.rpe, b.target_kg, b.note, b.order_index
        from public.program_blocks b
       where b.program_routine_id = v_routine.id
       order by b.order_index;

      v_created := v_created + 1;
    end loop;
  end loop;

  return v_created;
end;
$$;

comment on function public.assign_program(uuid, uuid[]) is
  'Gives each client their own copy of every routine in the program.';

grant execute on function public.assign_program(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Taking the copies back. Unlike a client removing their own, this destroys
-- work they may have done on it — which is why the screen that calls it names
-- them and asks first.
-- ---------------------------------------------------------------------------
create or replace function public.unassign_program(
  p_program_id uuid,
  p_client_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_removed integer;
begin
  if not exists (
    select 1 from public.programs p
     where p.id = p_program_id and p.coach_id = auth.uid()
  ) then
    raise exception 'that program is not yours to unassign' using errcode = '42501';
  end if;

  delete from public.routine_instances i
   using public.program_routines r
   where i.program_routine_id = r.id
     and r.program_id = p_program_id
     and i.coach_id = auth.uid()
     and i.client_id = any (coalesce(p_client_ids, '{}'::uuid[]));

  get diagnostics v_removed = row_count;
  return v_removed;
end;
$$;

grant execute on function public.unassign_program(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Publishing proposes; it never overwrites.
--
-- Every holder is asked — including one whose copy still matches the template,
-- because it is their copy either way. The cost is accepted knowingly: a typo
-- fix sits unapplied until each client takes it, and in exchange nobody opens
-- the app to find their routine silently different from last week's.
--
-- Returns how many clients were asked.
-- ---------------------------------------------------------------------------
create or replace function public.publish_program(p_program_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
  v_instance record;
  v_update_id uuid;
  v_summary text;
  v_asked integer := 0;
begin
  if not exists (
    select 1 from public.programs p
     where p.id = p_program_id and p.coach_id = auth.uid()
  ) then
    raise exception 'that program is not yours to publish' using errcode = '42501';
  end if;

  update public.programs
     set version = version + 1,
         status = 'published',
         has_draft_changes = false
   where id = p_program_id
  returning version into v_version;

  for v_instance in
    select i.id as instance_id, i.program_routine_id
      from public.routine_instances i
      join public.program_routines r on r.id = i.program_routine_id
     where r.program_id = p_program_id
  loop
    -- What changed, in words. Names whose prescription moved, plus anything
    -- newly added — enough for a client to recognise the change without
    -- opening it.
    select string_agg(b.name, ', ' order by b.order_index)
      into v_summary
      from public.program_blocks b
     where b.program_routine_id = v_instance.program_routine_id
       and not exists (
         select 1 from public.routine_blocks rb
          where rb.routine_instance_id = v_instance.instance_id
            and rb.name = b.name
            and rb.scheme = b.scheme
            and rb.target_kg is not distinct from b.target_kg
       );

    -- One proposal per copy: a second publish replaces the first rather than
    -- queueing, because nobody wants to answer a backlog.
    delete from public.routine_updates where routine_instance_id = v_instance.instance_id;

    insert into public.routine_updates (routine_instance_id, template_version, summary)
    values (v_instance.instance_id, v_version, coalesce(v_summary, 'Small changes'))
    returning id into v_update_id;

    insert into public.routine_update_blocks
      (routine_update_id, name, scheme, rpe, target_kg, note, order_index)
    select v_update_id, b.name, b.scheme, b.rpe, b.target_kg, b.note, b.order_index
      from public.program_blocks b
     where b.program_routine_id = v_instance.program_routine_id
     order by b.order_index;

    v_asked := v_asked + 1;
  end loop;

  return v_asked;
end;
$$;

grant execute on function public.publish_program(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The client's answer, and the only thing that moves their copy.
--
-- Accepting replaces the blocks and puts the copy back in step. Declining
-- keeps theirs and marks it diverged — a decision, not a deferral, so nothing
-- lingers waiting to be asked again.
-- ---------------------------------------------------------------------------
create or replace function public.decide_routine_update(
  p_routine_instance_id uuid,
  p_accept boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_update record;
begin
  if not exists (
    select 1 from public.routine_instances i
     where i.id = p_routine_instance_id and i.client_id = auth.uid()
  ) then
    raise exception 'that routine is not yours to answer for' using errcode = '42501';
  end if;

  select id, template_version into v_update
    from public.routine_updates
   where routine_instance_id = p_routine_instance_id;

  if v_update.id is null then
    return false;
  end if;

  if p_accept then
    delete from public.routine_blocks where routine_instance_id = p_routine_instance_id;

    insert into public.routine_blocks
      (routine_instance_id, name, scheme, rpe, target_kg, note, order_index)
    select p_routine_instance_id, b.name, b.scheme, b.rpe, b.target_kg, b.note, b.order_index
      from public.routine_update_blocks b
     where b.routine_update_id = v_update.id
     order by b.order_index;

    update public.routine_instances
       set base_version = v_update.template_version,
           diverged = false
     where id = p_routine_instance_id;
  else
    update public.routine_instances
       set diverged = true
     where id = p_routine_instance_id;
  end if;

  delete from public.routine_updates where id = v_update.id;
  return true;
end;
$$;

grant execute on function public.decide_routine_update(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Starting a workout.
--
-- One call rather than a session insert followed by an exercise insert per
-- lift and a set insert per set — which on gym wifi is a long way to get half
-- a workout. A NULL routine starts an empty one, for someone who walked in
-- without a plan.
--
-- Sets open at the routine's target weight, or zero where none is set — which
-- is also the right answer for a bodyweight movement.
-- ---------------------------------------------------------------------------
create or replace function public.start_workout(
  p_routine_instance_id uuid default null,
  p_title text default 'Quick workout'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client uuid := auth.uid();
  v_session_id uuid;
  v_block record;
  v_exercise_id uuid;
  v_sets integer;
  v_reps integer;
begin
  if p_routine_instance_id is not null and not exists (
    select 1 from public.routine_instances i
     where i.id = p_routine_instance_id and i.client_id = v_client
  ) then
    raise exception 'that routine is not yours to start' using errcode = '42501';
  end if;

  insert into public.workout_sessions (client_id, routine_instance_id, title)
  select
    v_client,
    p_routine_instance_id,
    coalesce((select i.name from public.routine_instances i
               where i.id = p_routine_instance_id), p_title)
  returning id into v_session_id;

  for v_block in
    select b.* from public.routine_blocks b
     where b.routine_instance_id = p_routine_instance_id
     order by b.order_index
  loop
    insert into public.workout_exercises
      (workout_session_id, name, coach_note, own_note, order_index)
    values (v_session_id, v_block.name, v_block.note, null, v_block.order_index)
    returning id into v_exercise_id;

    -- "4 × 8" is display text — the shape a coach types and a client reads —
    -- so the counts are read back out of it rather than stored twice.
    v_sets := coalesce(nullif(substring(v_block.scheme from '^\s*(\d+)'), '')::integer, 3);
    v_reps := coalesce(nullif(substring(v_block.scheme from '[×xX]\s*(\d+)'), '')::integer, 8);

    insert into public.workout_sets (workout_exercise_id, n, weight_kg, reps)
    select v_exercise_id, n, coalesce(v_block.target_kg, 0), v_reps
      from generate_series(1, greatest(v_sets, 1)) as n;
  end loop;

  return v_session_id;
end;
$$;

comment on function public.start_workout(uuid, text) is
  'Opens a workout from a routine, or an empty one when given no routine.';

grant execute on function public.start_workout(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Anything a client can already do under RLS stays a plain write: ticking a
-- set, editing a load, adding an exercise, finishing a workout. Wrapping those
-- in functions would only hide the policies that already say who may do them.
-- ---------------------------------------------------------------------------
