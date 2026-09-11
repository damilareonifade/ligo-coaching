-- ---------------------------------------------------------------------------
-- The coach ↔ client link.
--
-- Included because it is the one relation the rest of Ligo hangs off: a
-- program, a session log and a check-in are all "this coach, that client",
-- and a users table alone cannot express the app's core idea. Every domain
-- table added later should reference this link rather than re-deriving who
-- may see whom.
--
-- Scoped deliberately small — status, permissions, timestamps — so replacing
-- it costs one migration if the roster model turns out differently.
-- ---------------------------------------------------------------------------

create type public.coach_client_status as enum ('pending', 'active', 'paused', 'ended');

create table public.coach_clients (
  coach_id uuid not null references public.users (id) on delete cascade,
  client_id uuid not null references public.users (id) on delete cascade,
  status public.coach_client_status not null default 'pending',
  -- What the client has agreed to share, mirroring the onboarding screen.
  -- A coach reading a client's data checks this, never just the link.
  permissions jsonb not null default
    '{"workouts": false, "nutrition": false, "metrics": false}'::jsonb,
  -- True when the client asked the coach to log sessions on their behalf.
  log_for boolean not null default false,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (coach_id, client_id),
  constraint coach_clients_no_self_link check (coach_id <> client_id),
  constraint coach_clients_permission_keys check (
    permissions ?& array['workouts', 'nutrition', 'metrics']
  )
);

comment on table public.coach_clients is
  'Roster membership. The authority on which coach may read which client.';

-- The primary key covers every coach-side read ("my roster"). The reverse
-- direction — "who coaches me" — needs its own index, partial because the app
-- only ever asks about live links.
create index coach_clients_client_active_idx on public.coach_clients (client_id)
  where status = 'active';

-- Roster listings sort by recency and filter by status.
create index coach_clients_coach_status_idx
  on public.coach_clients (coach_id, status, accepted_at desc);

create trigger coach_clients_set_updated_at
  before update on public.coach_clients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS.
--
-- These policies deliberately reference only auth.uid() and this table's own
-- columns. A policy here that selected from public.users, whose own policies
-- select from this table, would recurse — Postgres detects it and errors at
-- query time, which is a miserable way to find out.
-- ---------------------------------------------------------------------------
alter table public.coach_clients enable row level security;

create policy coach_clients_select_either_side on public.coach_clients
  for select to authenticated
  using ((select auth.uid()) in (coach_id, client_id));

-- Either side may create the link: a coach invites, or a client attaches with
-- an invite code. The row must include the creator.
create policy coach_clients_insert_either_side on public.coach_clients
  for insert to authenticated
  with check ((select auth.uid()) in (coach_id, client_id));

create policy coach_clients_update_either_side on public.coach_clients
  for update to authenticated
  using ((select auth.uid()) in (coach_id, client_id))
  with check ((select auth.uid()) in (coach_id, client_id));

create policy coach_clients_delete_either_side on public.coach_clients
  for delete to authenticated
  using ((select auth.uid()) in (coach_id, client_id));

revoke all on public.coach_clients from anon, authenticated;
grant select, insert, update, delete on public.coach_clients to authenticated;

-- ---------------------------------------------------------------------------
-- Now that the link exists, a coach can read their clients' profiles — and
-- only theirs. Added here rather than in the foundation migration so the
-- dependency runs in one direction.
--
-- `security definer` breaks the policy recursion described above: the helper
-- reads coach_clients with RLS bypassed, and is safe to do so because it
-- answers a single yes/no about the caller's own id.
-- ---------------------------------------------------------------------------
create or replace function public.is_linked_to(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
      from public.coach_clients cc
     where cc.status = 'active'
       and (
         (cc.coach_id = auth.uid() and cc.client_id = p_user_id)
         or (cc.client_id = auth.uid() and cc.coach_id = p_user_id)
       )
  );
$$;

comment on function public.is_linked_to(uuid) is
  'True when the caller and the given user share an active roster link.';

grant execute on function public.is_linked_to(uuid) to authenticated;

create policy users_select_linked on public.users
  for select to authenticated
  using (public.is_linked_to(id));
