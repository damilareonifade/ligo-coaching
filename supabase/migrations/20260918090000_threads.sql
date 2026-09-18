-- ---------------------------------------------------------------------------
-- Messaging: one spine for every conversation in the app.
--
-- A coach↔client thread and a community group chat are the same thing with a
-- different number of people in it. The app has always known this — every
-- message the screens render carries `from: 'me' | 'them'`, "side-neutral on
-- purpose. One thread is rendered from two seats" — and `ApiGroupMessage`
-- repeats the field verbatim. Nothing above the database has ever cared
-- whether a thread holds two people or eight.
--
-- So one `threads`, one `thread_members`, one `messages`, and a direct thread
-- is a thread with two members. Building the two separately would mean writing
-- membership, unread counts, ordering and realtime twice, then fixing every
-- bug in both.
--
-- This migration lands the spine and direct threads only. Groups arrive later
-- and add `kind = 'group'` rows plus a `groups` table; the columns they need
-- are already here so that arrival is additive.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Threads.
--
-- `coach_id` and `client_id` are on the thread as well as in `thread_members`,
-- and the duplication is deliberate: it is what a unique index can hold. Two
-- taps on "message" a moment apart would otherwise open two threads with the
-- same two people in them, and a conversation split across two rows is not
-- recoverable by anything the app can do later.
-- ---------------------------------------------------------------------------
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct',
  -- Both NULL on a group thread, which is keyed by its group instead.
  coach_id uuid references public.users (id) on delete cascade,
  client_id uuid references public.users (id) on delete cascade,
  -- Set when the coach and client part. History stays readable; nothing new
  -- can be said. See the trigger at the foot of this file.
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint threads_kind_known check (kind in ('direct', 'group')),
  constraint threads_direct_has_two_sides check (
    (kind = 'direct' and coach_id is not null and client_id is not null)
    or (kind <> 'direct' and coach_id is null and client_id is null)
  ),
  constraint threads_no_self_thread check (coach_id is distinct from client_id)
);

comment on table public.threads is
  'One conversation. Two members when direct, many when it belongs to a group.';

comment on column public.threads.closed_at is
  'Set on detach. Reads survive it; writes do not — see messages_insert_as_member.';

-- The uniqueness the pair columns exist for.
create unique index threads_direct_pair_key
  on public.threads (coach_id, client_id)
  where kind = 'direct';

-- ---------------------------------------------------------------------------
-- Membership, and the read mark.
--
-- One table doing three jobs, which is why it earns its place: it is what
-- every policy below tests, it carries `last_read_at` so an inbox can show an
-- unread dot, and it will carry the per-thread display identity a group needs
-- — "chosen per board and per group, never once per client".
-- ---------------------------------------------------------------------------
create table public.thread_members (
  thread_id uuid not null references public.threads (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  -- 'admin' only ever on a group. A direct thread has two equals.
  role text not null default 'member',
  -- NULL until they have opened it once, which is not the same as zero: an
  -- unopened thread is unread however old it is.
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  -- Left a group, or was removed from one. Never set on a direct thread —
  -- that ends by closing, so both sides keep the history.
  left_at timestamptz,
  primary key (thread_id, user_id),
  constraint thread_members_role_known check (role in ('admin', 'member'))
);

comment on table public.thread_members is
  'Who is in a thread, and how far each of them has read.';

-- "My threads, most recent first" — the inbox, and the client''s one thread.
create index thread_members_user_idx
  on public.thread_members (user_id)
  where left_at is null;

-- ---------------------------------------------------------------------------
-- Messages.
--
-- `attachment_path` is here and unused on purpose. Text-only is the decision
-- for now; a nullable column costs nothing today and saves a migration over a
-- table that will be the largest in the schema by a wide margin.
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  -- NULL once the sender deletes their account. The message still happened,
  -- and a thread that loses half its turns rewrites a conversation the other
  -- person remembers having.
  sender_id uuid references public.users (id) on delete set null,
  body text not null,
  attachment_path text,
  created_at timestamptz not null default now(),
  constraint messages_body_not_blank check (btrim(body) <> '')
);

comment on table public.messages is
  'One turn in a conversation. Never edited, never deleted — see the policies.';

-- Every read of a thread is this: its messages, in order.
create index messages_thread_idx on public.messages (thread_id, created_at);

-- ---------------------------------------------------------------------------
-- Membership, asked safely.
--
-- `security definer`, and that is the whole point. A policy on `messages` that
-- selected `thread_members` directly would be subject to that table's own RLS,
-- which is itself expressed in terms of membership — Postgres reports the
-- recursion as a bare "infinite recursion detected in policy", from a query
-- that looks nothing like the cause.
-- ---------------------------------------------------------------------------
create or replace function public.is_thread_member(p_thread_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
      from public.thread_members tm
     where tm.thread_id = p_thread_id
       and tm.user_id = auth.uid()
       and tm.left_at is null
  );
$$;

comment on function public.is_thread_member(uuid) is
  'True when the caller is currently in this thread. Definer, to avoid RLS recursion.';

grant execute on function public.is_thread_member(uuid) to authenticated;

-- A thread that has been closed refuses new messages. Separate from
-- membership because leaving and closing are different endings.
create or replace function public.is_thread_open(p_thread_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.threads t where t.id = p_thread_id and t.closed_at is null
  );
$$;

comment on function public.is_thread_open(uuid) is
  'False once a thread is closed. Reads ignore this; writes do not.';

grant execute on function public.is_thread_open(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Policies.
--
-- The detach promise, in two lines. `src/lib/detach.ts` tells a client, on the
-- screen where they decide, that "history stays readable, but nothing new can
-- be sent". So the select policies do not mention `closed_at` and the insert
-- policy does. Getting that backwards in either direction breaks a promise
-- made on a confirmation dialog, which is the worst place to break one.
-- ---------------------------------------------------------------------------
alter table public.threads enable row level security;
alter table public.thread_members enable row level security;
alter table public.messages enable row level security;

create policy threads_select_as_member on public.threads
  for select to authenticated
  using (public.is_thread_member(id));

-- No insert, update or delete. A direct thread is opened by the trigger below
-- when a coach and client attach, and closed by it when they part; a client
-- who could close their own thread could silence a coach without detaching,
-- and one who could delete it could erase the other person's copy.

create policy thread_members_select_in_my_threads on public.thread_members
  for select to authenticated
  using (public.is_thread_member(thread_id));

-- Marking your own place, and nothing else. The column rules below are what
-- keep "your own row" from meaning "your own role".
create policy thread_members_update_own on public.thread_members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy messages_select_in_my_threads on public.messages
  for select to authenticated
  using (public.is_thread_member(thread_id));

create policy messages_insert_as_member on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_thread_member(thread_id)
    and public.is_thread_open(thread_id)
  );

-- No update and no delete policy, for both sides. A message somebody has
-- already read is a thing that was said; an app where it can be changed
-- afterwards, or vanish, is one where neither person can rely on what is on
-- the screen in front of them.

-- ---------------------------------------------------------------------------
-- `thread_members_update_own` is row-scoped, not column-scoped. Without this a
-- member could PATCH their own row's `role` to 'admin' — which means nothing
-- on a direct thread and means everything on the group threads to come.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_thread_member_column_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.thread_id <> old.thread_id
     or new.user_id <> old.user_id
     or new.role <> old.role
     or new.joined_at <> old.joined_at
     or new.left_at is distinct from old.left_at then
    raise exception 'only last_read_at may be changed' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger thread_members_column_rules
  before update on public.thread_members
  for each row execute function public.enforce_thread_member_column_rules();

revoke all on public.threads from anon, authenticated;
revoke all on public.thread_members from anon, authenticated;
revoke all on public.messages from anon, authenticated;

grant select on public.threads to authenticated;
grant select, update on public.thread_members to authenticated;
grant select, insert on public.messages to authenticated;

-- ---------------------------------------------------------------------------
-- A thread opens when a coach and client attach, and closes when they part.
--
-- Driven from `coach_clients` rather than from the app, because that table is
-- already "the authority on which coach may read which client" and a second
-- authority is a second thing to disagree. It also means a thread cannot be
-- conjured for somebody you do not coach.
--
-- Re-attaching reopens the same thread rather than starting a clean one. The
-- history is what makes a returning client a returning client, and the README
-- already says `invited_at` and `accepted_at` are what a re-attach is judged
-- against — a conversation that reset itself would be hiding the same thing.
-- ---------------------------------------------------------------------------
create or replace function public.sync_direct_thread()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread_id uuid;
begin
  if new.status = 'active' then
    insert into public.threads (kind, coach_id, client_id)
      values ('direct', new.coach_id, new.client_id)
      on conflict (coach_id, client_id) where kind = 'direct'
      do update set closed_at = null
      returning id into v_thread_id;

    insert into public.thread_members (thread_id, user_id)
      values (v_thread_id, new.coach_id), (v_thread_id, new.client_id)
      on conflict (thread_id, user_id) do nothing;

  elsif new.status = 'ended' then
    update public.threads
       set closed_at = now()
     where kind = 'direct'
       and coach_id = new.coach_id
       and client_id = new.client_id
       and closed_at is null;
  end if;

  return new;
end;
$$;

comment on function public.sync_direct_thread() is
  'Opens the thread on attach, closes it on detach, reopens it on re-attach.';

create trigger coach_clients_sync_thread
  after insert or update of status on public.coach_clients
  for each row execute function public.sync_direct_thread();
