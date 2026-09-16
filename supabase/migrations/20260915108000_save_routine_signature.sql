-- ---------------------------------------------------------------------------
-- Undoing an accidental overload.
--
-- The previous migration rewrote `save_routine` to accept the new block
-- columns and, in doing so, renamed its parameters — `p_routine_id` where the
-- original had `p_routine_instance_id`, and in a different order. Postgres
-- treats that as a different function, so `create or replace` created a second
-- one beside the first rather than replacing it.
--
-- Two consequences, both bad. PostgREST resolves overloads by argument name,
-- so a call naming the original parameters would still reach the *old* body
-- and silently drop the catalogue link and the new targets. And the generated
-- types carried two declarations of the same name, which is how this was
-- noticed at all.
--
-- The stray one is dropped and the original signature restored, with the new
-- columns added to the body where they belonged in the first place.
-- ---------------------------------------------------------------------------

drop function if exists public.save_routine(uuid, text, text, jsonb);

create or replace function public.save_routine(
  p_name text,
  p_blocks jsonb,
  p_note text default null,
  p_routine_instance_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := p_routine_instance_id;
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
    -- Both mean the same thing: no target load. The same holds for the two
    -- below — zero is the stepper's floor, not a distance anybody prescribed.
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

  return v_id;
end;
$$;

grant execute on function public.save_routine(text, jsonb, text, uuid) to authenticated;
