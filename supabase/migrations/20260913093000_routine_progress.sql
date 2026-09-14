-- ---------------------------------------------------------------------------
-- What the app reads a routine through.
--
-- "When was this last done" is derived from finished workouts and must never
-- be stored beside them — two copies of the same fact drift, and this one
-- decides which routine the client is shown next.
--
-- Deriving it in a view rather than on the phone matters: the alternative is
-- shipping every session a client has ever logged to a handset so it can take
-- a maximum. One row per routine, computed where the rows already are.
--
-- `security_invoker` so the view is subject to the caller's own policies on
-- routine_instances rather than the definer's. Without it a view is a way
-- round RLS, which is the last thing this schema wants.
-- ---------------------------------------------------------------------------
create view public.routine_instance_progress
with (security_invoker = on) as
select
  i.*,
  (
    select max(s.finished_at)
      from public.workout_sessions s
     where s.routine_instance_id = i.id
       and s.finished_at is not null
  ) as last_completed_at
from public.routine_instances i;

comment on view public.routine_instance_progress is
  'routine_instances plus last_completed_at, derived from finished workouts.';

grant select on public.routine_instance_progress to authenticated;

-- ---------------------------------------------------------------------------
-- How much training happened this week, against the program's target.
--
-- Monday-based, matching `startOfWeek` in src/lib/rotation.ts — a week that
-- starts on a different day in the database than in the app would make the
-- coach's count disagree with the client's.
-- ---------------------------------------------------------------------------
create or replace function public.weekly_progress(p_client_id uuid)
returns table (done integer, target integer)
language sql
security definer
stable
set search_path = ''
as $$
  select
    (
      select count(*)::integer
        from public.workout_sessions s
       where s.client_id = p_client_id
         and s.finished_at >= date_trunc('week', now())
    ) as done,
    coalesce(
      (
        select p.sessions_per_week
          from public.routine_instances i
          join public.program_routines r on r.id = i.program_routine_id
          join public.programs p on p.id = r.program_id
         where i.client_id = p_client_id
         order by i.order_index
         limit 1
      ),
      3
    ) as target
   where p_client_id = auth.uid()
      or public.has_client_permission(p_client_id, 'workouts');
$$;

comment on function public.weekly_progress(uuid) is
  'Sessions finished since Monday, and the target the client is measured against.';

grant execute on function public.weekly_progress(uuid) to authenticated;
