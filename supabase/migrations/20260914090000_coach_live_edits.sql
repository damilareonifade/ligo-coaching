-- ---------------------------------------------------------------------------
-- A coach changing a set while the client is standing in front of them.
--
-- Until now `workout_sets` said `client_id = auth.uid()` and nothing else: a
-- coach could watch a session land set by set and change none of it, which is
-- what the live screen's own notice promised — "A coach watching a set land is
-- not editing it."
--
-- That promise was right for watching from a distance and wrong for the gym
-- floor. A coach who sees someone grinding a heavy triple should be able to
-- drop the next set to something they will finish, without dictating it across
-- the room or waiting until next week.
--
-- Three things keep this from being a coach writing whatever they like:
--
--   1. `log_for` — the client's own switch, worded on their screen as "Sam can
--      log for me. Write access. Entries Sam adds are labelled with their name
--      in your history." The consent already had a slot for this.
--   2. Only a **live** session, and only sets **not yet done**. History is not
--      editable by anybody, and a coach cannot rewrite what somebody lifted.
--   3. Only the load and the reps. Ticking a set is a claim about what a
--      person did with their body, and it stays theirs to make.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- First, a hole this work uncovered.
--
-- `routine_blocks`, `workout_exercises` and `workout_sets` each had one
-- `for all` policy whose USING asked only whether the parent row was visible,
-- with the ownership test in WITH CHECK:
--
--   using  (exists (select 1 from workout_exercises e where e.id = ...))
--   with check (... and s.client_id = auth.uid())
--
-- WITH CHECK does not apply to DELETE. There is no new row to check. So the
-- read rule was the delete rule, and anyone who could *see* a row could
-- destroy it — a coach could delete a client's sets, their exercises, or the
-- blocks of a routine they hold. Nothing in the app does that, which is why it
-- went unnoticed; the API is not the boundary, the policy is.
--
-- Each is split in two: reading follows the parent, writing requires
-- ownership. The intent was always that; `for all` quietly merged them.
-- ---------------------------------------------------------------------------
drop policy routine_blocks_all_via_instance on public.routine_blocks;

create policy routine_blocks_select_via_instance on public.routine_blocks
  for select to authenticated
  using (
    exists (select 1 from public.routine_instances i where i.id = routine_instance_id)
  );

-- The client's own, or the coach who assigned it — copy-on-assign means both
-- sides may edit, and `routine_instances_update_assigned` says which coach.
create policy routine_blocks_write_via_instance on public.routine_blocks
  for all to authenticated
  using (
    exists (
      select 1 from public.routine_instances i
       where i.id = routine_instance_id
         and (i.client_id = (select auth.uid()) or i.coach_id = (select auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.routine_instances i
       where i.id = routine_instance_id
         and (i.client_id = (select auth.uid()) or i.coach_id = (select auth.uid()))
    )
  );

drop policy workout_exercises_all_via_session on public.workout_exercises;

create policy workout_exercises_select_via_session on public.workout_exercises
  for select to authenticated
  using (exists (select 1 from public.workout_sessions s where s.id = workout_session_id));

create policy workout_exercises_write_via_session on public.workout_exercises
  for all to authenticated
  using (
    exists (
      select 1 from public.workout_sessions s
       where s.id = workout_session_id and s.client_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions s
       where s.id = workout_session_id and s.client_id = (select auth.uid())
    )
  );

drop policy workout_sets_all_via_exercise on public.workout_sets;

create policy workout_sets_select_via_exercise on public.workout_sets
  for select to authenticated
  using (exists (select 1 from public.workout_exercises e where e.id = workout_exercise_id));

create policy workout_sets_write_via_exercise on public.workout_sets
  for all to authenticated
  using (
    exists (
      select 1
        from public.workout_exercises e
        join public.workout_sessions s on s.id = e.workout_session_id
       where e.id = workout_exercise_id and s.client_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
        from public.workout_exercises e
        join public.workout_sessions s on s.id = e.workout_session_id
       where e.id = workout_exercise_id and s.client_id = (select auth.uid())
    )
  );

-- Who last touched the set. NULL means the client, which is every row that
-- existed before this and the overwhelming majority after it.
alter table public.workout_sets
  add column updated_by uuid references public.users (id) on delete set null;

comment on column public.workout_sets.updated_by is
  'The coach who last changed this set. NULL when the client did it themselves.';

-- ---------------------------------------------------------------------------
-- What a coach may change, once they are allowed to change anything.
--
-- A trigger rather than the policy, for the reason every column rule in this
-- schema is a trigger: RLS sees the old row in USING and the new one in WITH
-- CHECK, never both, so "this column specifically may not move" cannot be
-- written as a policy.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_workout_set_column_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  owner uuid;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  select s.client_id into owner
    from public.workout_exercises e
    join public.workout_sessions s on s.id = e.workout_session_id
   where e.id = new.workout_exercise_id;

  -- The client doing their own workout. Everything below is about somebody
  -- else writing into it.
  if actor = owner then
    new.updated_by := null;
    return new;
  end if;

  -- Guarded here as well as in the policy below, because policies are OR'd:
  -- a permissive USING on any other policy would otherwise select a finished
  -- set for update and this rule would never run. A trigger cannot be OR'd
  -- away.
  if old.completed then
    raise exception 'a set that has been done is not editable' using errcode = '42501';
  end if;

  if new.n is distinct from old.n then
    raise exception 'a set cannot be renumbered' using errcode = '42501';
  end if;

  if new.completed is distinct from old.completed then
    raise exception 'only the lifter may tick a set off' using errcode = '42501';
  end if;

  -- Stamped rather than trusted: the client is entitled to know which numbers
  -- on their screen they did not put there.
  new.updated_by := actor;
  return new;
end;
$$;

comment on function public.enforce_workout_set_column_rules() is
  'Keeps a coach to the load and the reps, and signs what they changed.';

create trigger workout_sets_enforce_column_rules
  before update on public.workout_sets
  for each row execute function public.enforce_workout_set_column_rules();

-- ---------------------------------------------------------------------------
-- And the policy that lets them in at all.
--
-- Update only — a coach adds no sets and deletes none. `finished_at is null`
-- is what makes this about a workout in progress rather than a licence over
-- somebody's training history.
-- ---------------------------------------------------------------------------
create policy workout_sets_update_live_as_coach on public.workout_sets
  for update to authenticated
  using (
    not completed
    and exists (
      select 1
        from public.workout_exercises e
        join public.workout_sessions s on s.id = e.workout_session_id
       where e.id = workout_exercise_id
         and s.finished_at is null
         and public.can_log_for(s.client_id)
    )
  )
  with check (
    exists (
      select 1
        from public.workout_exercises e
        join public.workout_sessions s on s.id = e.workout_session_id
       where e.id = workout_exercise_id
         and s.finished_at is null
         and public.can_log_for(s.client_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Who is on the floor right now.
--
-- The coach's home screen leads with this, and it has to be one read rather
-- than a roster fetch plus a session fetch per client. `security_invoker`, so
-- a client who has not shared `workouts` simply does not appear — the same
-- rule `roster_clients` follows, and for the same reason.
-- ---------------------------------------------------------------------------
create view public.coach_live_sessions
with (security_invoker = on) as
select
  cc.coach_id,
  s.client_id,
  u.full_name,
  s.id as session_id,
  s.title,
  s.started_at,
  -- Enough to say "2 of 4 exercises" without pulling the whole workout down.
  (
    select count(*)::integer from public.workout_exercises e
     where e.workout_session_id = s.id
  ) as exercise_count,
  (
    select count(*)::integer
      from public.workout_sets ws
      join public.workout_exercises e on e.id = ws.workout_exercise_id
     where e.workout_session_id = s.id
  ) as set_count,
  (
    select count(*)::integer
      from public.workout_sets ws
      join public.workout_exercises e on e.id = ws.workout_exercise_id
     where e.workout_session_id = s.id and ws.completed
  ) as completed_set_count,
  -- Whether this coach may change anything, so the screen knows before the
  -- write is refused rather than after.
  cc.log_for
from public.workout_sessions s
join public.coach_clients cc
  on cc.client_id = s.client_id and cc.status = 'active'
join public.users u on u.id = s.client_id
where s.finished_at is null;

comment on view public.coach_live_sessions is
  'Clients with a workout open right now, for the coach''s home screen.';

grant select on public.coach_live_sessions to authenticated;
