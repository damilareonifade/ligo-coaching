-- ---------------------------------------------------------------------------
-- Reading a thread: the inbox row, and the header above a conversation.
--
-- The messages themselves need nothing here. `messages_select_in_my_threads`
-- already answers "may I read this", so the app selects them directly and
-- Postgres refuses anything else — a function wrapping that would be a second
-- copy of a rule that is already written down.
--
-- What does need a function is everything *around* the messages: the other
-- person's name, whether the thread is closed, what they share, and whether
-- there is anything unread. That is three tables joined per row, and one of
-- those joins cannot be made by the caller at all. See below.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- `security definer`, and not for convenience.
--
-- `roster_clients` is `security_invoker` on purpose — "so training activity
-- appears only where the client shared it" — and that is the right default.
-- It cannot be the default here, because of one row this has to read:
-- `users.full_name` for the person on the other side.
--
-- A client may read their coach's row only through `users_select_linked`,
-- which asks `is_linked_to`, which requires `status = 'active'`. The moment
-- they detach that stops being true — and a detached thread is exactly the
-- one this still has to name, since `src/lib/detach.ts` promises the history
-- stays readable and a history attributed to nobody is not readable.
--
-- So the function reads as owner and does the authorization itself, in the
-- one place it can be checked: `thread_members`, the caller's own row. A
-- thread the caller is not in produces no row, whatever else is true.
-- ---------------------------------------------------------------------------
create or replace function public.my_threads()
returns table (
  thread_id uuid,
  kind text,
  coach_id uuid,
  client_id uuid,
  -- Both sides, because one function serves both seats: the coach's inbox
  -- reads `client_name`, the client's single thread reads `coach_name`.
  coach_name text,
  client_name text,
  -- For the client's header chip. NULL on a group thread.
  coach_gym text,
  coach_specialties text[],
  -- The permissions the access label is derived from — `deriveAccess` in
  -- src/lib/roster.ts, so the wording lives with every other label.
  permissions jsonb,
  archived boolean,
  last_body text,
  last_at timestamptz,
  unread boolean
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    t.id,
    t.kind,
    t.coach_id,
    t.client_id,
    coach.full_name,
    client.full_name,
    cp.gym,
    cp.specialties,
    cc.permissions,
    t.closed_at is not null,
    last.body,
    last.created_at,
    -- Nothing to read is not unread, and neither is your own last word: a
    -- coach who answers somebody and returns to the inbox should not find
    -- their own reply sitting there as a thing to deal with.
    (
      last.created_at is not null
      and last.sender_id is distinct from auth.uid()
      and (me.last_read_at is null or last.created_at > me.last_read_at)
    )
  from public.thread_members me
  join public.threads t on t.id = me.thread_id
  left join public.users coach on coach.id = t.coach_id
  left join public.users client on client.id = t.client_id
  left join public.coach_profiles cp on cp.coach_id = t.coach_id
  left join public.coach_clients cc
    on cc.coach_id = t.coach_id and cc.client_id = t.client_id
  left join lateral (
    select m.body, m.created_at, m.sender_id
      from public.messages m
     where m.thread_id = t.id
     order by m.created_at desc
     limit 1
  ) last on true
  where me.user_id = auth.uid()
    and me.left_at is null
  -- Newest conversation first, and a thread nobody has spoken in yet sorts by
  -- when it opened rather than falling off the end.
  order by coalesce(last.created_at, t.created_at) desc;
$$;

comment on function public.my_threads() is
  'Every thread the caller is in, with the other side named and the unread mark.';

revoke all on function public.my_threads() from public, anon;
grant execute on function public.my_threads() to authenticated;

-- ---------------------------------------------------------------------------
-- Marking a thread read.
--
-- A plain update would do — `thread_members_update_own` allows it and the
-- column-rules trigger keeps it to `last_read_at` — but not from the client:
-- `now()` would be the phone's clock, and a device running a few minutes fast
-- marks messages read before they arrive, which is silent and permanent.
--
-- Written here so the timestamp is the database's own.
-- ---------------------------------------------------------------------------
create or replace function public.mark_thread_read(p_thread_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.thread_members
     set last_read_at = now()
   where thread_id = p_thread_id
     and user_id = auth.uid();
$$;

comment on function public.mark_thread_read(uuid) is
  'Moves the caller''s read mark to now. Invoker, so the row policy still decides.';

revoke all on function public.mark_thread_read(uuid) from public, anon;
grant execute on function public.mark_thread_read(uuid) to authenticated;
