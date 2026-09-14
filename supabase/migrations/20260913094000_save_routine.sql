-- ---------------------------------------------------------------------------
-- Saving a routine the client is editing.
--
-- The builder hands back the whole exercise list, not a diff — block ids are
-- not stable across an edit, and a reorder changes every row anyway — so a
-- save is "replace what is there". Done from the phone that is four round
-- trips (read, update, delete, insert), and the gap between the delete and
-- the insert is a routine with no exercises in it. On gym wifi that gap is
-- where a client's routine goes missing.
--
-- `security invoker`, unlike the verbs in 20260913092000: everything here is
-- something the client may already do under their own policies, so RLS is the
-- authorization and there is none to re-implement. The function exists for
-- atomicity, not for privilege.
-- ---------------------------------------------------------------------------
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
  v_client uuid := auth.uid();
  v_id uuid := p_routine_instance_id;
  v_template uuid;
begin
  if v_client is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  -- The table constraint would catch this, but as `violates check constraint
  -- routine_instances_name_not_blank` — which is not something to show a
  -- person who left a box empty.
  if length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception 'a routine needs a name' using errcode = '23514';
  end if;

  if v_id is null then
    -- No coach_id and no base_version: a routine the client built has nothing
    -- behind it, which is what `templateId: null` means to the app.
    insert into public.routine_instances (client_id, name, note)
    values (v_client, btrim(p_name), p_note)
    returning id into v_id;
  else
    select i.program_routine_id into v_template
      from public.routine_instances i
     where i.id = v_id and i.client_id = v_client;

    -- RLS makes a routine that is not theirs invisible rather than forbidden,
    -- so "no such row" and "not yours" arrive here as the same thing.
    if not found then
      raise exception 'that routine is not yours to edit' using errcode = '42501';
    end if;

    update public.routine_instances
       set name = btrim(p_name),
           note = p_note,
           -- Editing a copy of a coach's routine is exactly what divergence
           -- means. One the client built has nothing to diverge from, so it
           -- stays false however much they change it.
           diverged = (v_template is not null)
     where id = v_id;
  end if;

  delete from public.routine_blocks where routine_instance_id = v_id;

  insert into public.routine_blocks
    (routine_instance_id, name, scheme, rpe, target_kg, note, order_index)
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
    b.order_index
  from jsonb_to_recordset(coalesce(p_blocks, '[]'::jsonb)) as b(
    name text,
    scheme text,
    rpe text,
    target_kg numeric,
    note text,
    order_index integer
  );

  return v_id;
end;
$$;

comment on function public.save_routine(text, jsonb, text, uuid) is
  'Creates or rewrites one of the caller''s own routines, blocks and all, in one transaction.';

grant execute on function public.save_routine(text, jsonb, text, uuid) to authenticated;
