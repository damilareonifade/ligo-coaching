-- ---------------------------------------------------------------------------
-- The leaderboard a group has.
--
-- Every group has one; nobody is on it until they say so. Those are two
-- separate decisions and this schema keeps them separate — joining a group is
-- choosing to talk to people, and appearing on its board is publishing what
-- you lifted to the same people. The app already asks for the second in its
-- own words: "I understand my ranking and total volume will be visible to
-- everyone on this leaderboard."
--
-- So `board_members` is its own table rather than a flag on `thread_members`,
-- and it carries its own identity. The choice is per board and per group,
-- never once per person: "appearing as 'Maya A.' among six people you train
-- with is a different decision from appearing as 'Maya A.' among thirty."
-- ---------------------------------------------------------------------------
alter table public.groups
  add column board_metric text not null default 'volume',
  add column board_window text not null default 'month',
  -- Only meaningful for the 'custom' window.
  add column board_from date,
  add column board_to date;

alter table public.groups add constraint groups_board_metric_known check (
  board_metric in (
    'volume', 'sessions', 'streak', 'weight-lifted',
    'distance', 'time', 'prs', 'consistency', 'check-ins'
  )
);

alter table public.groups add constraint groups_board_window_known
  check (board_window in ('week', 'month', 'quarter', 'custom'));

alter table public.groups add constraint groups_board_custom_has_dates check (
  board_window <> 'custom'
  or (board_from is not null and board_to is not null and board_to >= board_from)
);

comment on column public.groups.board_metric is
  'What the group''s board ranks. Every one is counted from what this app watched happen.';

create table public.board_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  -- Its own, not the group's. Somebody may be "Maya A." in the conversation
  -- and a handle on the ranking, and that is a coherent thing to want.
  identity text not null default 'first',
  handle text,
  opted_in_at timestamptz not null default now(),
  primary key (group_id, user_id),
  constraint board_members_identity_known
    check (identity in ('real', 'first', 'handle')),
  constraint board_members_handle_matches_identity check (
    (identity = 'handle' and handle is not null and btrim(handle) <> '')
    or (identity <> 'handle' and handle is null)
  )
);

comment on table public.board_members is
  'Who has agreed to appear on a group''s ranking. Membership of the group is not enough.';

alter table public.board_members enable row level security;

-- Visible to the group, not to the world: a ranking you are on is read by the
-- people you agreed to be read by.
create policy board_members_select_in_my_group on public.board_members
  for select to authenticated
  using (
    exists (
      select 1 from public.threads t
       where t.group_id = board_members.group_id and public.is_thread_member(t.id)
    )
  );

-- Leaving is your own to do and nobody else's — not even an admin's. An admin
-- can remove somebody from the conversation; taking them off a ranking they
-- opted into is a different act and is not on offer.
create policy board_members_delete_own on public.board_members
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.board_members from anon, authenticated;
grant select, delete on public.board_members to authenticated;

-- ---------------------------------------------------------------------------
-- Opting in.
--
-- A function rather than an insert policy, so the identity is validated in the
-- same breath as the membership check and there is no shape of this that
-- writes one without the other.
-- ---------------------------------------------------------------------------
create or replace function public.join_board(
  p_group_id uuid,
  p_identity text default 'first',
  p_handle text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread_id uuid;
begin
  select t.id into v_thread_id from public.threads t where t.group_id = p_group_id;

  if v_thread_id is null or not public.is_thread_member(v_thread_id) then
    raise exception 'That leaderboard is no longer available.' using errcode = '42501';
  end if;

  insert into public.board_members (group_id, user_id, identity, handle)
    values (p_group_id, auth.uid(), p_identity,
            nullif(btrim(coalesce(p_handle, '')), ''))
  on conflict (group_id, user_id) do update
    set identity = excluded.identity, handle = excluded.handle;
end;
$$;

comment on function public.join_board(uuid, text, text) is
  'Agrees to appear on a group''s ranking, under a name chosen for that ranking alone.';

revoke all on function public.join_board(uuid, text, text) from public, anon;
grant execute on function public.join_board(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Where a window starts and ends.
--
-- Monday-based, to match `startOfWeek` and `weekly_progress` — a week that
-- began on a different day here than it does on the Today screen would put two
-- different answers to "this week" on two screens of one app.
-- ---------------------------------------------------------------------------
-- `returns table` rather than OUT parameters, which produce a bare `record`
-- that `scripts/gen_types.py` cannot name — and every other function here is
-- written this way.
create or replace function public.board_window_bounds(
  p_window text,
  p_from date,
  p_to date
)
returns table (starts timestamptz, ends timestamptz)
language sql
immutable
set search_path = ''
as $$
  select
    case
      -- Inclusive of the last day, which is what somebody picking "to 30 Sep"
      -- means by it.
      when p_window = 'custom' then p_from::timestamptz
      when p_window = 'week' then date_trunc('week', now())
      when p_window = 'quarter' then date_trunc('quarter', now())
      else date_trunc('month', now())
    end,
    case when p_window = 'custom' then (p_to + 1)::timestamptz else now() end;
$$;

-- ---------------------------------------------------------------------------
-- The standings.
--
-- One function, nine metrics, because they differ only in what they count and
-- sharing the window, the membership and the ordering is what keeps them
-- honest against each other.
--
-- The value comes back as a number and is composed into a string by the app.
-- That is deliberate: "42,180 kg" depends on whether the reader has chosen
-- kilograms or pounds, and formatting it here would hand every reader the same
-- unit regardless.
-- ---------------------------------------------------------------------------
create or replace function public.board_standings(p_group_id uuid)
returns table (
  user_id uuid,
  display_name text,
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
  v_starts timestamptz;
  v_ends timestamptz;
  v_thread_id uuid;
begin
  select t.id into v_thread_id from public.threads t where t.group_id = p_group_id;

  -- Nothing at all to somebody outside the group, rather than an error: a
  -- group is invisible, and so is its ranking.
  if v_thread_id is null or not public.is_thread_member(v_thread_id) then
    return;
  end if;

  select g.board_metric into v_metric from public.groups g where g.id = p_group_id;

  select b.starts, b.ends into v_starts, v_ends
    from public.groups g,
         lateral public.board_window_bounds(g.board_window, g.board_from, g.board_to) b
   where g.id = p_group_id;

  return query
  with opted_in as (
    select bm.user_id, bm.identity, bm.handle, u.full_name
      from public.board_members bm
      join public.users u on u.id = bm.user_id
     where bm.group_id = p_group_id
  ),
  -- Finished sessions only. An unfinished workout "counts for nothing and
  -- advances no rotation" everywhere else in this schema; a ranking is not
  -- the place to start counting it.
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
        /*
         * Derived, because there is nothing stored to count.
         *
         * `workout_sets.is_pr` was dropped in 20260913104000 — "it was
         * written by nothing… a column that is read but never written is
         * worse than a missing one" — and `personal_records` has computed
         * bests ever since. So a PR here is a set that beat everything the
         * same person had ever done on the same lift before it, which is what
         * the word means and what that function already assumes: matched on
         * the exercise's name, completed, and carrying a load.
         */
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
        when 'check-ins' then
          (select count(*) from public.body_measurements m
            where m.client_id = o.user_id
              and m.measured_at >= v_starts and m.measured_at < v_ends)
        -- Distinct weeks with a finished session in them. "Evenly spread
        -- rather than crammed" is the whole point: six sessions in one week
        -- counts once, and cannot beat six weeks with one session each.
        when 'consistency' then
          (select count(distinct date_trunc('week', x.finished_at))
             from sessions x where x.client_id = o.user_id)
        -- The longest unbroken run of those weeks, rather than how many there
        -- were. Not "weeks on plan": that needs an assigned routine, which
        -- somebody training alone does not have.
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
    public.community_display_name(scored.identity, scored.full_name, scored.handle),
    scored.value::numeric,
    -- Dense, so two people on the same total are both second and nobody is
    -- told they are third for having tied.
    dense_rank() over (order by scored.value desc)::integer
  from scored
  order by scored.value desc,
           public.community_display_name(scored.identity, scored.full_name, scored.handle);
end;
$$;

comment on function public.board_standings(uuid) is
  'One group''s ranking. Values are numbers — the unit is the reader''s to choose.';

revoke all on function public.board_standings(uuid) from public, anon;
grant execute on function public.board_standings(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- How many of the group are not on its board.
--
-- The same shape as `group_invited_not_joined`, and the same reason: "naming
-- who declined would undo the whole point of the opt-in, so the shape cannot
-- carry it even if a server wanted to send it." A count, to anybody in the
-- group — it is their own number as much as an admin's.
-- ---------------------------------------------------------------------------
create or replace function public.board_not_opted_in(p_group_id uuid)
returns integer
language sql
security definer
stable
set search_path = ''
as $$
  select case
    when not exists (
      select 1 from public.threads t
       where t.group_id = p_group_id and public.is_thread_member(t.id)
    ) then 0
    else (
      select count(*)::integer
        from public.thread_members tm
        join public.threads t on t.id = tm.thread_id
       where t.group_id = p_group_id
         and tm.left_at is null
         and not exists (
           select 1 from public.board_members bm
            where bm.group_id = p_group_id and bm.user_id = tm.user_id
         )
    )
  end;
$$;

comment on function public.board_not_opted_in(uuid) is
  'How many group members are not on the board. A count only — the names are nobody''s.';

revoke all on function public.board_not_opted_in(uuid) from public, anon;
grant execute on function public.board_not_opted_in(uuid) to authenticated;
