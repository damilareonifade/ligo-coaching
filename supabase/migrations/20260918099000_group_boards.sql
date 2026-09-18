-- ---------------------------------------------------------------------------
-- A leaderboard belongs inside a group, and a group may rank several things.
--
-- `20260918098000` put one metric on the group itself, which said a group has
-- exactly one ranking. It does not: a group picks one or all of them, and each
-- is its own ranking with its own people on it.
--
-- So the metric moves off `groups` and into a table with a row per ranked
-- thing. Each row has an id, which is what `/community/board/[id]` and
-- `ApiCommunityBoard.id` have always expected and what the single column could
-- never give them.
--
-- The window stays on the group: one period the group competes over, rather
-- than nine that can disagree about what "this month" means on one screen.
-- ---------------------------------------------------------------------------
create table public.group_boards (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  metric text not null,
  created_at timestamptz not null default now(),
  -- Ranking the same thing twice is the same ranking.
  unique (group_id, metric),
  constraint group_boards_metric_known check (
    metric in (
      'volume', 'sessions', 'streak', 'weight-lifted',
      'distance', 'time', 'prs', 'consistency', 'check-ins'
    )
  )
);

comment on table public.group_boards is
  'One ranked metric inside a group. A group may have none, one, or all of them.';

create index group_boards_group_idx on public.group_boards (group_id);

-- Every group that already had a metric keeps it, as its first board.
insert into public.group_boards (group_id, metric)
select g.id, g.board_metric from public.groups g
on conflict (group_id, metric) do nothing;

alter table public.groups drop column board_metric;

-- ---------------------------------------------------------------------------
-- Opting in, per ranking.
--
-- `board_members` was keyed on the group, which was one yes for whatever the
-- group ranked — including anything it started ranking later. Somebody may be
-- happy to appear on "sessions completed", which is effort and which anyone
-- can win, and not on "best single lift", which is how strong they already
-- are. Those are different disclosures and they get different answers.
--
-- It also makes the design's own sentence true as written: an identity is
-- "chosen per board and per group, never once per client".
-- ---------------------------------------------------------------------------
alter table public.board_members add column board_id uuid references public.group_boards (id)
  on delete cascade;

update public.board_members bm
   set board_id = (
     select gb.id from public.group_boards gb where gb.group_id = bm.group_id limit 1
   );

-- Anybody whose group had no board at all has nothing to be opted in to.
delete from public.board_members where board_id is null;

-- Dropped before the column, not after: a policy naming `group_id` is a
-- dependency on it, and Postgres refuses the drop while one stands.
drop policy if exists board_members_select_in_my_group on public.board_members;
drop policy if exists board_members_delete_own on public.board_members;

alter table public.board_members
  drop constraint board_members_pkey,
  drop column group_id,
  alter column board_id set not null,
  add primary key (board_id, user_id);

comment on table public.board_members is
  'Who has agreed to appear on one ranking. Answered per ranking, not per group.';

create policy board_members_select_in_my_group on public.board_members
  for select to authenticated
  using (
    exists (
      select 1
        from public.group_boards gb
        join public.threads t on t.group_id = gb.group_id
       where gb.id = board_members.board_id
         and public.is_thread_member(t.id)
    )
  );

-- Still the member's own and not an admin's: an admin may remove somebody from
-- the conversation, but taking them off a ranking they opted into is a
-- different act and is not on offer.
create policy board_members_delete_own on public.board_members
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Adding and removing a ranking. An admin's, like the group's name.
-- ---------------------------------------------------------------------------
create or replace function public.add_group_board(p_group_id uuid, p_metric text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_board_id uuid;
begin
  if not public.is_group_admin(p_group_id) then
    raise exception 'only an admin may add a ranking' using errcode = '42501';
  end if;

  insert into public.group_boards (group_id, metric)
    values (p_group_id, p_metric)
  on conflict (group_id, metric) do update set metric = excluded.metric
  returning id into v_board_id;

  return v_board_id;
end;
$$;

revoke all on function public.add_group_board(uuid, text) from public, anon;
grant execute on function public.add_group_board(uuid, text) to authenticated;

create or replace function public.remove_group_board(p_board_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  select gb.group_id into v_group_id from public.group_boards gb where gb.id = p_board_id;

  if v_group_id is null or not public.is_group_admin(v_group_id) then
    raise exception 'only an admin may remove a ranking' using errcode = '42501';
  end if;

  -- Everybody's opt-in goes with it, by cascade. Removing a ranking is not a
  -- way to keep their consent for a later one.
  delete from public.group_boards where id = p_board_id;
end;
$$;

revoke all on function public.remove_group_board(uuid) from public, anon;
grant execute on function public.remove_group_board(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The three board functions now speak in boards rather than groups.
-- ---------------------------------------------------------------------------
drop function if exists public.join_board(uuid, text, text);

create or replace function public.join_board(
  p_board_id uuid,
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
  select t.id into v_thread_id
    from public.group_boards gb
    join public.threads t on t.group_id = gb.group_id
   where gb.id = p_board_id;

  if v_thread_id is null or not public.is_thread_member(v_thread_id) then
    raise exception 'That leaderboard is no longer available.' using errcode = '42501';
  end if;

  insert into public.board_members (board_id, user_id, identity, handle)
    values (p_board_id, auth.uid(), p_identity,
            nullif(btrim(coalesce(p_handle, '')), ''))
  on conflict (board_id, user_id) do update
    set identity = excluded.identity, handle = excluded.handle;
end;
$$;

comment on function public.join_board(uuid, text, text) is
  'Agrees to appear on one ranking, under a name chosen for that ranking alone.';

revoke all on function public.join_board(uuid, text, text) from public, anon;
grant execute on function public.join_board(uuid, text, text) to authenticated;

drop function if exists public.board_not_opted_in(uuid);

create or replace function public.board_not_opted_in(p_board_id uuid)
returns integer
language sql
security definer
stable
set search_path = ''
as $$
  select case
    when not exists (
      select 1
        from public.group_boards gb
        join public.threads t on t.group_id = gb.group_id
       where gb.id = p_board_id and public.is_thread_member(t.id)
    ) then 0
    else (
      select count(*)::integer
        from public.thread_members tm
        join public.threads t on t.id = tm.thread_id
        join public.group_boards gb on gb.group_id = t.group_id
       where gb.id = p_board_id
         and tm.left_at is null
         and not exists (
           select 1 from public.board_members bm
            where bm.board_id = p_board_id and bm.user_id = tm.user_id
         )
    )
  end;
$$;

comment on function public.board_not_opted_in(uuid) is
  'How many of the group are not on this ranking. A count only — the names are nobody''s.';

revoke all on function public.board_not_opted_in(uuid) from public, anon;
grant execute on function public.board_not_opted_in(uuid) to authenticated;

drop function if exists public.board_standings(uuid);

create or replace function public.board_standings(p_board_id uuid)
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
  v_group_id uuid;
  v_starts timestamptz;
  v_ends timestamptz;
  v_thread_id uuid;
begin
  select gb.metric, gb.group_id into v_metric, v_group_id
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
    public.community_display_name(scored.identity, scored.full_name, scored.handle),
    scored.value::numeric,
    dense_rank() over (order by scored.value desc)::integer
  from scored
  order by scored.value desc,
           public.community_display_name(scored.identity, scored.full_name, scored.handle);
end;
$$;

comment on function public.board_standings(uuid) is
  'One ranking. Values are numbers — the unit is the reader''s to choose.';

revoke all on function public.board_standings(uuid) from public, anon;
grant execute on function public.board_standings(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Every ranking in the caller's groups, for the community index.
-- ---------------------------------------------------------------------------
create or replace function public.my_boards()
returns table (
  board_id uuid,
  group_id uuid,
  group_name text,
  metric text,
  opted_in boolean,
  member_count integer
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    gb.id,
    g.id,
    g.name,
    gb.metric,
    exists (
      select 1 from public.board_members bm
       where bm.board_id = gb.id and bm.user_id = auth.uid()
    ),
    (select count(*)::integer from public.board_members bm where bm.board_id = gb.id)
  from public.group_boards gb
  join public.groups g on g.id = gb.group_id
  join public.threads t on t.group_id = g.id
  join public.thread_members me
    on me.thread_id = t.id and me.user_id = auth.uid() and me.left_at is null
  order by g.name, gb.metric;
$$;

comment on function public.my_boards() is
  'Every ranking inside every group the caller is in, and whether they are on it.';

revoke all on function public.my_boards() from public, anon;
grant execute on function public.my_boards() to authenticated;
