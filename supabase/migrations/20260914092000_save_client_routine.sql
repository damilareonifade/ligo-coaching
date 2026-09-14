-- ---------------------------------------------------------------------------
-- A coach editing one client's copy.
--
-- The counterpart to `save_routine`, which is the client's own, and separate
-- from it because the authorization is different in both directions. A client
-- may rewrite any routine they hold, including one they built. A coach may
-- only touch a copy **they** assigned — what a client built for themselves is
-- not theirs to rewrite — which is exactly what
-- `routine_instances_update_assigned` already says.
--
-- Same reason for existing as every other save verb here: a routine is a row
-- plus its exercises, and an update followed by a block replace can half-land
-- on a dropped connection, leaving a client mid-program with a routine that
-- has no exercises in it.
--
-- `security invoker`: the policies already decide who may write this row, so
-- there is nothing to re-implement. The function exists for atomicity.
-- ---------------------------------------------------------------------------
create or replace function public.save_client_routine(
  p_routine_instance_id uuid,
  p_name text,
  p_blocks jsonb,
  p_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_coach uuid := auth.uid();
begin
  if v_coach is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception 'a routine needs a name' using errcode = '23514';
  end if;

  update public.routine_instances
     set name = btrim(p_name),
         note = p_note,
         -- A coach's edit moves the copy away from the template just as the
         -- client's own would. Divergence is a fact about the copy, not about
         -- who typed it — and it is what the coach's next publish collides
         -- with, so it has to be true whoever made the change.
         diverged = true
   where id = p_routine_instance_id;

  -- RLS refuses a copy this coach did not assign, and one the client built for
  -- themselves, by making the row invisible rather than forbidden — so "no
  -- such routine" and "not yours" arrive here as the same thing.
  if not found then
    raise exception 'that routine is not yours to edit' using errcode = '42501';
  end if;

  delete from public.routine_blocks where routine_instance_id = p_routine_instance_id;

  insert into public.routine_blocks
    (routine_instance_id, name, scheme, rpe, target_kg, note, order_index)
  select
    p_routine_instance_id,
    b.name,
    coalesce(nullif(btrim(b.scheme), ''), '3 × 10'),
    coalesce(b.rpe, ''),
    -- Null for a bodyweight movement; a stepper taken to the bottom sends 0,
    -- which `routine_blocks_target_positive` refuses and which means the same.
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

  return p_routine_instance_id;
end;
$$;

comment on function public.save_client_routine(uuid, text, jsonb, text) is
  'A coach rewriting a copy they assigned, blocks and all, in one transaction.';

grant execute on function public.save_client_routine(uuid, text, jsonb, text) to authenticated;
