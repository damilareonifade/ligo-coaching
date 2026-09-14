-- ---------------------------------------------------------------------------
-- A coach asking for something they have not been given.
--
-- The button already exists on the review screen, and the comment beside it
-- says "a coach who taps twice has asked twice, and the client is the one who
-- hears about it". The client never heard about it: the request went nowhere
-- and the only thing that changed was a chip turning grey. This is the table
-- that makes the promise true.
--
-- It is a question, never a grant. Nothing here can widen what a coach sees —
-- the only row that decides that is coach_clients.permissions, and the only
-- person who can move it is the client, on their own screen, in their own app.
-- ---------------------------------------------------------------------------
create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.users (id) on delete cascade,
  client_id uuid not null references public.users (id) on delete cascade,
  -- The domain ids the screens already use, matching the keys in
  -- coach_clients.permissions. 'workouts' is here for completeness even though
  -- the review screen does not currently offer it.
  domain text not null,
  requested_at timestamptz not null default now(),
  answered_at timestamptz,
  granted boolean,
  constraint access_requests_domain_known
    check (domain in ('workouts', 'nutrition', 'metrics', 'health', 'monthly')),
  constraint access_requests_no_self check (coach_id <> client_id),
  -- Answered and decided arrive together or not at all; a row with one of them
  -- is a request in a state nothing can read.
  constraint access_requests_answer_complete
    check ((answered_at is null) = (granted is null))
);

comment on table public.access_requests is
  'A coach asking a client to share a domain. A question, never a grant.';

-- One open question per domain. A coach tapping twice has asked once, which is
-- better than the alternative: the person on the other end does not need the
-- same notification twice because someone double-tapped on gym wifi.
create unique index access_requests_open_idx
  on public.access_requests (coach_id, client_id, domain)
  where answered_at is null;

-- The client's inbox: everything still waiting on them, newest first.
create index access_requests_client_open_idx
  on public.access_requests (client_id, requested_at desc)
  where answered_at is null;

alter table public.access_requests enable row level security;

-- Both sides read their own: the coach to know what they have asked, the
-- client to know what they have been asked.
create policy access_requests_select_either_side on public.access_requests
  for select to authenticated
  using ((select auth.uid()) in (coach_id, client_id));

-- Writes go through the two functions below, which is where the rules live.
revoke all on public.access_requests from anon, authenticated;
grant select on public.access_requests to authenticated;

-- ---------------------------------------------------------------------------
-- Asking.
--
-- Idempotent while a question is open, so the row is the same one whether the
-- coach tapped once or five times. Returns the request either way, so the
-- screen can show when it was first asked rather than resetting the clock.
--
-- `security invoker` would do for the write, but the check that the link is
-- active has to read coach_clients for a pairing the coach may only see rows
-- of — and asking for something already granted should be refused rather than
-- quietly recorded, which needs the permissions read.
-- ---------------------------------------------------------------------------
create or replace function public.request_access(p_client_id uuid, p_domain text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coach uuid := auth.uid();
  v_link public.coach_clients;
  v_id uuid;
begin
  if v_coach is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  if p_domain not in ('workouts', 'nutrition', 'metrics', 'health', 'monthly') then
    raise exception 'there is nothing by that name to ask for' using errcode = '22023';
  end if;

  select cc.* into v_link
    from public.coach_clients cc
   where cc.coach_id = v_coach and cc.client_id = p_client_id and cc.status = 'active';

  if not found then
    raise exception 'that client is not on your roster' using errcode = '42501';
  end if;

  if coalesce((v_link.permissions ->> p_domain)::boolean, false) then
    raise exception 'they already share that with you' using errcode = '22023';
  end if;

  -- The partial unique index makes the conflict target "the open one", so a
  -- second tap lands on the row the first one made. The update is deliberately
  -- a no-op — DO NOTHING returns no row, and the caller needs the id — and it
  -- leaves `requested_at` alone so the screen can still say when they first
  -- asked rather than resetting the clock on every tap.
  insert into public.access_requests (coach_id, client_id, domain)
  values (v_coach, p_client_id, p_domain)
  on conflict (coach_id, client_id, domain) where answered_at is null
  do update set requested_at = public.access_requests.requested_at
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.request_access(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Answering.
--
-- Granting flips the permission and closes the question in one transaction.
-- Two statements from a phone would leave a request answered with nothing
-- shared, or something shared with the question still open — and the second of
-- those would have the coach asking again for what they already have.
--
-- Declining is a real answer and is recorded as one. It does not stop the
-- coach asking again later; a request that could never be repeated would make
-- "no" mean "never", which is not what the client said.
-- ---------------------------------------------------------------------------
create or replace function public.answer_access_request(
  p_request_id uuid,
  p_grant boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client uuid := auth.uid();
  v_request public.access_requests;
begin
  if v_client is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  select r.* into v_request
    from public.access_requests r
   where r.id = p_request_id and r.client_id = v_client and r.answered_at is null;

  if not found then
    raise exception 'that request is not yours to answer' using errcode = '42501';
  end if;

  update public.access_requests
     set answered_at = now(), granted = p_grant
   where id = p_request_id;

  if p_grant then
    update public.coach_clients
       set permissions = permissions || jsonb_build_object(v_request.domain, true)
     where coach_id = v_request.coach_id and client_id = v_client;
  end if;
end;
$$;

grant execute on function public.answer_access_request(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Withdrawing what was granted.
--
-- The other half, and the one that matters more: a client who can grant but
-- not take back has not been given a choice. Closes any open request for the
-- same domain too — a coach should not be left with a question outstanding
-- about something the client has just answered by turning it off.
-- ---------------------------------------------------------------------------
create or replace function public.set_coach_permission(p_domain text, p_shared boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client uuid := auth.uid();
  v_shared boolean := coalesce(p_shared, false);
  v_coach uuid;
begin
  if v_client is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  if p_domain not in ('workouts', 'nutrition', 'metrics', 'health', 'monthly') then
    raise exception 'there is nothing by that name to share' using errcode = '22023';
  end if;

  -- Definer, so the scoping that RLS would have done is written out: this
  -- touches the caller's own link and no other.
  update public.coach_clients
     set permissions = permissions || jsonb_build_object(p_domain, v_shared)
   where client_id = v_client and status = 'active'
  returning coach_id into v_coach;

  if v_coach is null then
    raise exception 'you have no coach attached' using errcode = '42501';
  end if;

  -- Turning something on answers the question the coach was waiting on, and
  -- turning it off answers it too. Either way they should not be left with an
  -- outstanding ask about something the client has just decided.
  update public.access_requests
     set answered_at = now(), granted = v_shared
   where coach_id = v_coach
     and client_id = v_client
     and domain = p_domain
     and answered_at is null;
end;
$$;

grant execute on function public.set_coach_permission(text, boolean) to authenticated;
