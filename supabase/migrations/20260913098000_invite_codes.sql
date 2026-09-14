-- ---------------------------------------------------------------------------
-- How a client finds a coach.
--
-- One direction of travel: the coach publishes a code, the client enters it,
-- and the client decides what is shared. There is no way for a coach to look
-- someone up, which is deliberate — an "invite by email" box is an account
-- checker, and the roster's own empty state already promises the other model:
-- "They attach themselves, they choose what you can see."
--
-- The code was previously invented on the phone, twice, by two different
-- rules: the fixtures held 'SAM-4KQ2' and src/screens/onboarding/CoachCodeStep
-- computed one from the coach's name. A coach saw one code while signing up
-- and a different one on their roster afterwards. A code is an identity, so
-- it is issued once, here, and stored.
-- ---------------------------------------------------------------------------

alter table public.users add column invite_code text;

comment on column public.users.invite_code is
  'A coach''s shareable code. NULL for clients. Issued by trigger, never chosen.';

-- Partial, because every client row is NULL and there is no point indexing
-- those — and NULLs would not conflict anyway.
create unique index users_invite_code_key
  on public.users (invite_code) where invite_code is not null;

-- Three letters, a dash, four characters from an alphabet with no I and no O.
-- The shape matters: this gets read aloud across a gym floor and typed by
-- someone who has just installed the app.
alter table public.users add constraint users_invite_code_shape
  check (invite_code is null or invite_code ~ '^[A-Z]{3}-[0-9A-HJ-NP-Z]{4}$');

-- ---------------------------------------------------------------------------
-- Issuing one.
--
-- `gen_random_uuid()` rather than `random()`: random() is a per-session PRNG
-- and its output is predictable to anyone who can watch it, which is the wrong
-- property for something that lets a stranger put themselves on a roster.
-- v4 UUIDs come from the platform CSPRNG and need no extension.
-- ---------------------------------------------------------------------------
create or replace function public.mint_invite_code(p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_prefix text;
  v_bytes bytea;
  v_code text;
  v_attempt integer := 0;
begin
  -- First name, letters only, padded — so "Sam Okafor" reads as SAM-… and a
  -- name with no Latin letters still produces something typable.
  v_prefix := left(
    regexp_replace(upper(split_part(btrim(coalesce(p_name, '')), ' ', 1)), '[^A-Z]', '', 'g')
      || 'XXX',
    3
  );

  loop
    v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_code := v_prefix || '-' || (
      select string_agg(
               substr(v_alphabet, 1 + (get_byte(v_bytes, i) % length(v_alphabet)), 1),
               '' order by i)
        from generate_series(0, 3) as i
    );

    exit when not exists (select 1 from public.users u where u.invite_code = v_code);

    v_attempt := v_attempt + 1;
    -- 34^4 codes share a prefix. Twenty collisions running means something is
    -- wrong that a retry will not fix.
    if v_attempt > 20 then
      raise exception 'could not issue an invite code' using errcode = '55000';
    end if;
  end loop;

  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- A code is issued when someone becomes a coach, which is not always at
-- signup: Google sign-in leaves `role_confirmed` false and the role is chosen
-- a screen later.
--
-- Only ever when there is none. A rename must not change a code that has
-- already been shared into a group chat.
-- ---------------------------------------------------------------------------
create or replace function public.ensure_coach_invite_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role = 'coach' and new.invite_code is null then
    new.invite_code := public.mint_invite_code(new.full_name);
  end if;
  return new;
end;
$$;

create trigger users_ensure_invite_code
  before insert or update of role, invite_code on public.users
  for each row execute function public.ensure_coach_invite_code();

-- Coaches who existed before this migration.
do $$
declare v_coach record;
begin
  for v_coach in select id, full_name from public.users
                  where role = 'coach' and invite_code is null loop
    update public.users
       set invite_code = public.mint_invite_code(v_coach.full_name)
     where id = v_coach.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Issued, not chosen. Without this a coach could PATCH themselves a vanity
-- code, or take one that has been handed out — `users_update_own` is
-- row-scoped, not column-scoped.
--
-- `regenerate_invite_code` below is security definer, so it runs as the owner
-- and this guard lets it through.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_user_column_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.id <> old.id then
    raise exception 'id is immutable' using errcode = '42501';
  end if;

  if lower(new.email) <> lower(old.email) then
    raise exception 'email is managed by Supabase Auth' using errcode = '42501';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'created_at is immutable' using errcode = '42501';
  end if;

  if new.invite_code is distinct from old.invite_code then
    raise exception 'invite codes are issued, not chosen' using errcode = '42501';
  end if;

  if old.role_confirmed and new.role <> old.role then
    raise exception 'role cannot be changed once confirmed' using errcode = '42501';
  end if;

  -- Confirming is one-way; un-confirming would reopen the role for writing.
  if old.role_confirmed and not new.role_confirmed then
    raise exception 'role_confirmed cannot be reverted' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rolling it. A code shared into a group chat is out there permanently, so a
-- coach needs a way to stop honouring it. Everyone already attached stays
-- attached — the code is a door, not the relationship.
-- ---------------------------------------------------------------------------
create or replace function public.regenerate_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_code text;
begin
  select public.mint_invite_code(u.full_name) into v_code
    from public.users u
   where u.id = v_actor and u.role = 'coach';

  if v_code is null then
    raise exception 'only a coach has an invite code' using errcode = '42501';
  end if;

  update public.users set invite_code = v_code where id = v_actor;
  return v_code;
end;
$$;

grant execute on function public.regenerate_invite_code() to authenticated;

-- ---------------------------------------------------------------------------
-- Every code tried, and by whom.
--
-- Entering a valid code reveals a coach's name, photo and client count, so the
-- code space is a directory to anyone willing to walk it. This is the ledger
-- the rate limit below counts, in the same shape as password_reset_requests.
--
-- Lookups require a session, which is the bigger half of the defence: walking
-- 34^4 codes now costs an account and is attributable to it.
-- ---------------------------------------------------------------------------
create table public.coach_code_lookups (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null references public.users (id) on delete cascade,
  code text not null,
  found boolean not null,
  looked_up_at timestamptz not null default now()
);

create index coach_code_lookups_actor_idx
  on public.coach_code_lookups (actor, looked_up_at desc);

alter table public.coach_code_lookups enable row level security;

-- No policies at all. Nobody reads this through the API; the definer function
-- below is the only thing that writes it.
revoke all on public.coach_code_lookups from anon, authenticated;

-- ---------------------------------------------------------------------------
-- The lookup.
--
-- Returns a coach's name, photo and how many clients they have — enough for
-- the client to recognise who they are about to attach to, and nothing that
-- is not already on a business card. Never the email.
--
-- A code that matches nothing returns **no rows** rather than raising, and
-- that is the load-bearing detail. Each statement is its own transaction, so
-- an exception rolls back the ledger row written moments before it — which
-- would leave the rate limit counting only the lookups that succeeded, and an
-- attacker's lookups are precisely the ones that fail. Returning empty commits
-- the count. The caller turns "no rows" into the message.
-- ---------------------------------------------------------------------------
create or replace function public.lookup_coach(p_code text)
returns table (id uuid, full_name text, avatar_url text, client_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_recent integer;
  v_coach public.users;
begin
  if v_actor is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  if v_code = '' then
    raise exception 'Enter an invite code.' using errcode = '22023';
  end if;

  select count(*) into v_recent
    from public.coach_code_lookups l
   where l.actor = v_actor and l.looked_up_at > now() - interval '1 hour';

  -- Generous for someone mistyping a code off a screenshot; useless for
  -- walking the code space.
  if v_recent >= 10 then
    raise exception 'Too many code attempts. Try again in an hour.'
      using errcode = '54000';
  end if;

  select u.* into v_coach
    from public.users u
   where u.invite_code = v_code and u.role = 'coach' and u.role_confirmed;

  insert into public.coach_code_lookups (actor, code, found)
  values (v_actor, v_code, v_coach.id is not null);

  -- Empty, not an exception — see the note above. This is the path that has to
  -- leave a mark behind it.
  if v_coach.id is null then
    return;
  end if;

  -- Raising here does discard the ledger row, and that is fine: someone
  -- entering their own code already knows it, so there is nothing to
  -- enumerate and nothing worth counting.
  if v_coach.id = v_actor then
    raise exception 'That is your own invite code.' using errcode = '22023';
  end if;

  return query
  select
    v_coach.id,
    v_coach.full_name,
    v_coach.avatar_url,
    (select count(*)::integer from public.coach_clients cc
      where cc.coach_id = v_coach.id and cc.status = 'active');
end;
$$;

grant execute on function public.lookup_coach(text) to authenticated;

-- ---------------------------------------------------------------------------
-- What a client may share.
--
-- Two of the four domains the coach's review screen can ask about — the health
-- profile and monthly check-ins — had nowhere to be granted: `permissions`
-- carried workouts, nutrition and metrics only. A request button for something
-- with no matching switch is a question the client has no screen to answer, so
-- the column now carries every domain the app names.
--
-- The keys are the domain ids the screens already use, verbatim. One
-- vocabulary across the coach's request, the client's switch and the column
-- means there is no table of synonyms to keep in step.
-- ---------------------------------------------------------------------------
alter table public.coach_clients
  alter column permissions set default
    '{"workouts": false, "nutrition": false, "metrics": false,
      "health": false, "monthly": false}'::jsonb;

update public.coach_clients
   set permissions = '{"health": false, "monthly": false}'::jsonb || permissions
 where not (permissions ?& array['health', 'monthly']);

alter table public.coach_clients drop constraint coach_clients_permission_keys;

alter table public.coach_clients add constraint coach_clients_permission_keys
  check (permissions ?& array['workouts', 'nutrition', 'metrics', 'health', 'monthly']);

-- The consent trigger hardcoded the old three-key object when it reset a
-- coach's invitation, which would now violate the constraint above.
create or replace function public.enforce_coach_client_column_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if actor = new.coach_id then
      new.status := 'pending';
      new.permissions := '{"workouts": false, "nutrition": false, "metrics": false,
                           "health": false, "monthly": false}'::jsonb;
      new.log_for := false;
      new.accepted_at := null;
    end if;

    return new;
  end if;

  if new.coach_id <> old.coach_id or new.client_id <> old.client_id then
    raise exception 'the link itself is immutable' using errcode = '42501';
  end if;

  if actor = new.client_id then
    return new;
  end if;

  if new.permissions is distinct from old.permissions then
    raise exception 'only the client may change what they share' using errcode = '42501';
  end if;

  if new.log_for is distinct from old.log_for then
    raise exception 'only the client may allow a coach to log for them'
      using errcode = '42501';
  end if;

  if new.accepted_at is distinct from old.accepted_at then
    raise exception 'only the client may accept an invitation' using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     and new.status not in ('paused', 'ended') then
    raise exception 'a coach may pause or end a link, not activate it'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Attaching.
--
-- `security definer` because it has to establish that the target is actually a
-- coach, and a client cannot read the row of someone they are not yet linked
-- to — which is the whole point of `users_select_linked`.
--
-- One coach at a time. The table would allow several, but every screen in the
-- app is singular — the Today card, the profile section, the detach sheet —
-- and a database that permits what the app cannot render is a bug waiting for
-- someone to find it.
-- ---------------------------------------------------------------------------
create or replace function public.attach_coach(
  p_coach_id uuid,
  p_workouts boolean default false,
  p_nutrition boolean default false,
  p_metrics boolean default false,
  p_health boolean default false,
  p_monthly boolean default false,
  p_log_for boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client uuid := auth.uid();
begin
  if v_client is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  if p_coach_id = v_client then
    raise exception 'you cannot coach yourself' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.users u
     where u.id = p_coach_id and u.role = 'coach' and u.role_confirmed
  ) then
    raise exception 'that is not a coach' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.coach_clients cc
     where cc.client_id = v_client
       and cc.coach_id <> p_coach_id
       and cc.status in ('active', 'pending', 'paused')
  ) then
    raise exception 'detach from your current coach first' using errcode = '23505';
  end if;

  -- Upsert, because a link that was ended is a row that already exists.
  -- Re-attaching is a fresh grant, not a resurrection of the old one.
  insert into public.coach_clients
    (coach_id, client_id, status, permissions, log_for, accepted_at, ended_at)
  values (
    p_coach_id,
    v_client,
    'active',
    jsonb_build_object(
      'workouts', coalesce(p_workouts, false),
      'nutrition', coalesce(p_nutrition, false),
      'metrics', coalesce(p_metrics, false),
      'health', coalesce(p_health, false),
      'monthly', coalesce(p_monthly, false)
    ),
    coalesce(p_log_for, false),
    now(),
    null
  )
  on conflict (coach_id, client_id) do update
     set status = 'active',
         permissions = excluded.permissions,
         log_for = excluded.log_for,
         accepted_at = now(),
         ended_at = null;
end;
$$;

grant execute on function public.attach_coach(
  uuid, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Detaching.
--
-- Ends the link rather than deleting the row — `invited_at` and `accepted_at`
-- are the history a re-attach is judged against, and the client keeps the
-- delete policy for a genuine erasure. Permissions are zeroed as well as the
-- status changed: `has_client_permission` already requires an active link, but
-- a row that says 'ended' while still listing what is shared is a row that
-- reads wrong to the next person to look at it.
--
-- `security invoker`: the update policy and the consent trigger already say a
-- client may do this to their own link.
-- ---------------------------------------------------------------------------
create or replace function public.detach_coach()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.coach_clients
     set status = 'ended',
         ended_at = now(),
         permissions = '{"workouts": false, "nutrition": false, "metrics": false,
                         "health": false, "monthly": false}'::jsonb,
         log_for = false
   where client_id = auth.uid() and status <> 'ended';
end;
$$;

grant execute on function public.detach_coach() to authenticated;

-- ---------------------------------------------------------------------------
-- And the thing detaching is supposed to mean.
--
-- `routine_instances_select_as_coach` read `coach_id = auth.uid()` on its own,
-- with no check that the link was still live. A coach who had been detached
-- went on seeing every copy they had ever assigned — the name the client had
-- since given it, whether they had edited it, and through
-- routine_instance_progress, when they last trained. The detach sheet promises
-- "Access ends immediately", and for anything the coach had assigned it was
-- not true.
--
-- `is_linked_to` requires an active link in either direction, which is what
-- ends here. The same goes for editing: a coach who is no longer coaching
-- someone has no business rewriting their routine.
-- ---------------------------------------------------------------------------
drop policy routine_instances_select_as_coach on public.routine_instances;

create policy routine_instances_select_as_coach on public.routine_instances
  for select to authenticated
  using (
    (coach_id = (select auth.uid()) and public.is_linked_to(client_id))
    or public.has_client_permission(client_id, 'workouts')
  );

drop policy routine_instances_update_assigned on public.routine_instances;

create policy routine_instances_update_assigned on public.routine_instances
  for update to authenticated
  using (
    coach_id = (select auth.uid())
    and program_routine_id is not null
    and public.is_linked_to(client_id)
  )
  with check (
    coach_id = (select auth.uid())
    and program_routine_id is not null
    and public.is_linked_to(client_id)
  );
