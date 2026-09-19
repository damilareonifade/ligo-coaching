-- ---------------------------------------------------------------------------
-- Where everybody was last week.
--
-- Every row on a leaderboard has a slot for "↑2" and every row has shown a
-- dash, because nothing remembered yesterday: `board_standings` counts the
-- sessions and the kilos at the moment it is asked and sorts them. "You moved
-- up two" needs a before, and there was no before anywhere in this schema.
--
-- So: a snapshot per board per week, and a delta read off the newest one older
-- than the current week. Weekly rather than daily because these metrics move
-- on the timescale of training rather than of hours — a daily arrow on a
-- monthly volume board would mostly report the noise of who trained on a
-- Tuesday.
--
-- Keyed by the week rather than by the instant it was taken, so writing one
-- twice is writing it once. That is what makes the capture safe to run from a
-- schedule, by hand, or twice by accident.
-- ---------------------------------------------------------------------------
create table public.board_rank_snapshots (
  board_id uuid not null references public.group_boards (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  -- The Monday of the week this was taken in.
  period_start date not null,
  rank integer not null,
  captured_at timestamptz not null default now(),
  primary key (board_id, user_id, period_start)
);

comment on table public.board_rank_snapshots is
  'Where each member stood on each board, once a week. The only "before" there is.';

-- Read by `board_standings` and written by `snapshot_board_ranks`, both
-- `security definer`. Nobody reaches this table directly: a row here is one
-- member''s position under whatever name they chose, and the rule about who
-- may see that lives in `board_standings` rather than being restated here.
alter table public.board_rank_snapshots enable row level security;
revoke all on public.board_rank_snapshots from anon, authenticated;

-- ---------------------------------------------------------------------------
-- The numbers, with nobody's name on them and no question about who is asking.
--
-- Split out of `board_standings` because the capture below has no caller to
-- check: it runs on a schedule, where `auth.uid()` is null and every board in
-- the database is in scope. Leaving the membership check inside the scoring
-- would have meant either a second copy of this arithmetic or a job that
-- could see nothing.
--
-- So the arithmetic is here, ungated, and not granted to anybody. The gate is
-- `board_standings`, which is the only way in from the app.
-- ---------------------------------------------------------------------------
create or replace function public.board_scores(p_board_id uuid)
returns table (
  user_id uuid,
  value numeric,
  rank integer
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_metric text;
  v_group_id uuid;
  v_starts timestamptz;
  v_ends timestamptz;
begin
  select gb.metric, gb.group_id into v_metric, v_group_id
    from public.group_boards gb where gb.id = p_board_id;

  if v_group_id is null then
    return;
  end if;

  select b.starts, b.ends into v_starts, v_ends
    from public.groups g,
         lateral public.board_window_bounds(g.board_window, g.board_from, g.board_to) b
   where g.id = v_group_id;

  return query
  with opted_in as (
    select bm.user_id, bm.identity, bm.handle, u.full_name
      from public.board_members bm
      join public.users u on u.id = bm.user_id
     where bm.board_id = p_board_id
  ),
  sessions as (
    select s.id, s.client_id, s.finished_at
      from public.workout_sessions s
      join opted_in o on o.user_id = s.client_id
     where s.finished_at is not null
       and s.finished_at >= v_starts
       and s.finished_at < v_ends
  ),
  sets as (
    select s.client_id, s.finished_at, we.name,
           ws.weight_kg, ws.reps, ws.distance_km, ws.duration_seconds
      from sessions s
      join public.workout_exercises we on we.workout_session_id = s.id
      join public.workout_sets ws on ws.workout_exercise_id = we.id
     where ws.completed
  ),
  scored as (
    select o.user_id, o.identity, o.handle, o.full_name,
      case v_metric
        when 'volume' then
          coalesce((select sum(x.weight_kg * x.reps) from sets x where x.client_id = o.user_id), 0)
        when 'sessions' then
          (select count(*) from sessions x where x.client_id = o.user_id)
        when 'weight-lifted' then
          coalesce((select max(x.weight_kg) from sets x where x.client_id = o.user_id), 0)
        when 'distance' then
          coalesce((select sum(x.distance_km) from sets x where x.client_id = o.user_id), 0)
        when 'time' then
          coalesce((select sum(x.duration_seconds) from sets x where x.client_id = o.user_id), 0)
        when 'check-ins' then
          (select count(*) from public.body_measurements m
            where m.client_id = o.user_id
              and m.measured_at >= v_starts and m.measured_at < v_ends)
        when 'consistency' then
          (select count(distinct date_trunc('week', x.finished_at))
             from sessions x where x.client_id = o.user_id)
        when 'prs' then
          (select count(*)
             from sets x
            where x.client_id = o.user_id
              and x.weight_kg > 0
              and x.weight_kg > coalesce((
                select max(ws0.weight_kg)
                  from public.workout_sessions s0
                  join public.workout_exercises we0 on we0.workout_session_id = s0.id
                  join public.workout_sets ws0 on ws0.workout_exercise_id = we0.id
                 where s0.client_id = o.user_id
                   and s0.finished_at is not null
                   and s0.finished_at < x.finished_at
                   and we0.name = x.name
                   and ws0.completed
              ), 0))
        when 'streak' then
          coalesce((
            select max(run) from (
              select count(*) as run
                from (
                  select date_trunc('week', x.finished_at) as wk,
                         row_number() over (order by date_trunc('week', x.finished_at))
                           as seq
                    from sessions x
                   where x.client_id = o.user_id
                   group by date_trunc('week', x.finished_at)
                ) weeks
               group by wk - (seq * interval '1 week')
            ) runs
          ), 0)
        else 0
      end as value
    from opted_in o
  )
  select
    scored.user_id,
    scored.value::numeric,
    dense_rank() over (order by scored.value desc)::integer
  from scored;
end;
$$;

comment on function public.board_scores(uuid) is
  'One ranking as numbers, with no membership check. Internal — see board_standings.';

revoke all on function public.board_scores(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Taking the picture.
--
-- Every board, every week, once. `on conflict do nothing` is what makes the
-- second run of the week a no-op rather than a second opinion — so this is
-- safe from a schedule, from a hand, and from both at the same time.
--
-- It writes the week it runs in rather than the week just gone, because a
-- board that nobody opened for a month should still be able to say what has
-- changed since somebody last looked at it.
-- ---------------------------------------------------------------------------
create or replace function public.snapshot_board_ranks()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_board record;
  v_period date := date_trunc('week', now())::date;
  v_written integer := 0;
  v_rows integer;
begin
  for v_board in select gb.id from public.group_boards gb loop
    insert into public.board_rank_snapshots (board_id, user_id, period_start, rank)
    select v_board.id, s.user_id, v_period, s.rank
      from public.board_scores(v_board.id) s
    on conflict (board_id, user_id, period_start) do nothing;

    get diagnostics v_rows = row_count;
    v_written := v_written + v_rows;
  end loop;

  return v_written;
end;
$$;

comment on function public.snapshot_board_ranks() is
  'Records every board''s order for this week. Idempotent — one picture per week.';

revoke all on function public.snapshot_board_ranks() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The ranking, now able to say what has changed.
--
-- `delta` is the older rank minus the current one, so a positive number is a
-- climb: 3rd last week and 1st now is +2. Null until there is a week older
-- than this one to compare against, which the app renders as the dash it has
-- always shown — an arrow invented from no measurement would be worse than no
-- arrow.
--
-- Dropped and recreated rather than replaced: the return shape gains a column.
-- ---------------------------------------------------------------------------
drop function if exists public.board_standings(uuid);

create or replace function public.board_standings(p_board_id uuid)
returns table (
  user_id uuid,
  display_name text,
  value numeric,
  rank integer,
  delta integer
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_thread_id uuid;
  v_period date := date_trunc('week', now())::date;
begin
  select gb.group_id into v_group_id
    from public.group_boards gb where gb.id = p_board_id;

  if v_group_id is null then
    return;
  end if;

  select t.id into v_thread_id from public.threads t where t.group_id = v_group_id;

  -- Nothing at all to somebody outside the group, rather than an error: a
  -- group is invisible, and so is every ranking inside it.
  if v_thread_id is null or not public.is_thread_member(v_thread_id) then
    return;
  end if;

  return query
  with scores as (
    select s.user_id, s.value, s.rank from public.board_scores(p_board_id) s
  ),
  -- The newest week older than this one. Not simply the newest row: a picture
  -- taken an hour ago is this week's, and "you have not moved since an hour
  -- ago" is not news anybody wants.
  last_seen as (
    select distinct on (r.user_id) r.user_id, r.rank
      from public.board_rank_snapshots r
     where r.board_id = p_board_id
       and r.period_start < v_period
     order by r.user_id, r.period_start desc
  ),
  named as (
    select
      sc.user_id,
      public.community_display_name(bm.identity, u.full_name, bm.handle) as display_name,
      sc.value,
      sc.rank,
      (ls.rank - sc.rank) as delta
    from scores sc
    join public.board_members bm on bm.board_id = p_board_id and bm.user_id = sc.user_id
    join public.users u on u.id = sc.user_id
    left join last_seen ls on ls.user_id = sc.user_id
  )
  select named.user_id, named.display_name, named.value, named.rank, named.delta
    from named
   order by named.value desc, named.display_name;
end;
$$;

comment on function public.board_standings(uuid) is
  'One ranking. Values are numbers — the unit is the reader''s to choose. `delta` climbs positive.';

revoke all on function public.board_standings(uuid) from public, anon;
grant execute on function public.board_standings(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The schedule.
--
-- Guarded like `supabase_realtime` and the storage bucket, and for the same
-- reason: the throwaway Postgres the behavioural checks run against is not a
-- Supabase project and has no pg_cron. Where it is missing, nothing is
-- scheduled, no snapshot is ever written, and every delta stays null — which
-- is exactly the dash the app showed before any of this existed. Degrading to
-- the old behaviour is the point.
--
-- Monday, a few minutes past three in the morning UTC, which is nobody's
-- training session.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;

    if exists (select 1 from cron.job where jobname = 'board-rank-snapshots') then
      perform cron.unschedule('board-rank-snapshots');
    end if;

    perform cron.schedule(
      'board-rank-snapshots',
      '7 3 * * 1',
      $job$select public.snapshot_board_ranks()$job$
    );
  end if;
end
$$;

-- One picture now, so the first arrow appears after next Monday rather than
-- after the one following it.
select public.snapshot_board_ranks();
