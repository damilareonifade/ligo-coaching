-- ---------------------------------------------------------------------------
-- Training history, summarised.
--
-- Two reads that the profile hero and the coach's review both need, and that
-- neither should do by pulling every session a person has ever logged onto a
-- phone to count them. A streak in particular is a gaps-and-islands problem —
-- cheap here, tedious and slow anywhere else.
--
-- Both answer for the caller, or for a client who has shared `workouts` with
-- them. That is the same rule `weekly_progress` uses and it is deliberately
-- the only rule: a coach sees a client's training exactly when the client said
-- they could, and nothing here is a second opinion on that.
-- ---------------------------------------------------------------------------
create or replace function public.client_stats(p_client_id uuid)
returns table (sessions integer, week_streak integer, personal_records integer)
language sql
security definer
stable
set search_path = ''
as $$
  with finished as (
    select date_trunc('week', s.finished_at) as week
      from public.workout_sessions s
     where s.client_id = p_client_id and s.finished_at is not null
     group by 1
  ),
  -- Consecutive weeks, counted back from the current one. The row_number
  -- trick: subtracting a dense sequence from the week number makes every
  -- unbroken run share a value, so the run containing this week is the streak.
  runs as (
    select week,
           week - (row_number() over (order by week))::integer * interval '1 week' as run
      from finished
  )
  select
    (
      select count(*)::integer from public.workout_sessions s
       where s.client_id = p_client_id and s.finished_at is not null
    ),
    coalesce((
      select count(*)::integer from runs
       where run = (select run from runs where week = date_trunc('week', now()))
    ), 0),
    (
      select count(*)::integer
        from public.workout_sets ws
        join public.workout_exercises we on we.id = ws.workout_exercise_id
        join public.workout_sessions s on s.id = we.workout_session_id
       where s.client_id = p_client_id and ws.is_pr
    )
   where p_client_id = auth.uid()
      or public.has_client_permission(p_client_id, 'workouts');
$$;

comment on function public.client_stats(uuid) is
  'Sessions finished, the current unbroken week streak, and PRs.';

grant execute on function public.client_stats(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Week by week, for the adherence bars on the coach's review.
--
-- Every week in the window is returned, including the empty ones — a chart
-- that silently drops a week the client did nothing tells the opposite of the
-- truth. `generate_series` supplies the weeks; the sessions join onto them.
--
-- Monday-based, matching `startOfWeek` in src/lib/rotation.ts and
-- `weekly_progress`, so all three agree on where a week begins.
-- ---------------------------------------------------------------------------
create or replace function public.client_weekly_history(
  p_client_id uuid,
  p_weeks integer default 8
)
returns table (week_start timestamptz, done integer, target integer)
language sql
security definer
stable
set search_path = ''
as $$
  select
    w.week_start,
    (
      select count(*)::integer from public.workout_sessions s
       where s.client_id = p_client_id
         and s.finished_at >= w.week_start
         and s.finished_at < w.week_start + interval '1 week'
    ) as done,
    (select target from public.weekly_progress(p_client_id)) as target
  from (
    select date_trunc('week', now()) - (n * interval '1 week') as week_start
      from generate_series(least(greatest(coalesce(p_weeks, 8), 1), 52) - 1, 0, -1) as n
  ) w
  where p_client_id = auth.uid()
     or public.has_client_permission(p_client_id, 'workouts');
$$;

comment on function public.client_weekly_history(uuid, integer) is
  'One row per week in the window, empty weeks included, with the target of the day.';

grant execute on function public.client_weekly_history(uuid, integer) to authenticated;
