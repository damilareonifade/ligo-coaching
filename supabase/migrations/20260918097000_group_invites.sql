-- ---------------------------------------------------------------------------
-- Being asked into a group, as opposed to letting yourself in.
--
-- Two doors, and they are not alternatives. `join_group` exists for the people
-- you cannot name — a client's training partners, who appear in no list this
-- app can show them — and a code is the only thing that reaches them without
-- an account-lookup box. An invite exists for the people you *can* name, and
-- it is the better door for them, because it arrives on their screen instead
-- of over WhatsApp.
--
-- It also keeps the rule `src/api/community.ts` states in its own header:
-- "a coach's create is an *invite* — it can put a board on someone's screen
-- and nothing else. Only the client's own join and accept can put them in it,
-- and those carry the identity they picked. There is no endpoint in this
-- module through which a coach can add a person to anything." Nothing here
-- adds a member. It adds a question.
-- ---------------------------------------------------------------------------
create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  invitee_id uuid not null references public.users (id) on delete cascade,
  -- NULL once they delete their account. The invitation still happened.
  invited_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- NULL while it is still a question.
  responded_at timestamptz,
  accepted boolean,
  -- One open question per person per group. Asking twice is the same ask.
  unique (group_id, invitee_id),
  constraint group_invites_answer_shape check (
    (responded_at is null and accepted is null)
    or (responded_at is not null and accepted is not null)
  )
);

comment on table public.group_invites is
  'A question put to somebody. Answering it is the only thing that adds them.';

create index group_invites_invitee_idx
  on public.group_invites (invitee_id)
  where responded_at is null;

alter table public.group_invites enable row level security;

-- The person asked sees their own. An admin sees their group's — which is what
-- makes a count of who has not answered possible without naming any of them.
create policy group_invites_select_own on public.group_invites
  for select to authenticated
  using (invitee_id = (select auth.uid()) or public.is_group_admin(group_id));

-- No insert, update or delete: both sides go through the functions below, so
-- neither "invited" nor "answered" can be written without the checks.

revoke all on public.group_invites from anon, authenticated;
grant select on public.group_invites to authenticated;

-- ---------------------------------------------------------------------------
-- Asking.
--
-- Only somebody you are already linked to, and that is the account-checker
-- guard rather than a courtesy. Without it this takes a list of user ids and
-- answers whether each one exists — which is the "invite by email" box this
-- schema refuses elsewhere, wearing a different hat.
-- ---------------------------------------------------------------------------
create or replace function public.invite_to_group(
  p_group_id uuid,
  p_user_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_user_id uuid;
  v_thread_id uuid;
  v_sent integer := 0;
begin
  if not public.is_group_admin(p_group_id) then
    raise exception 'only an admin may invite somebody' using errcode = '42501';
  end if;

  select t.id into v_thread_id from public.threads t where t.group_id = p_group_id;

  foreach v_user_id in array coalesce(p_user_ids, '{}'::uuid[]) loop
    -- Silently skipped rather than refused, and deliberately: an error naming
    -- which id was rejected would answer "is this a real account" one id at a
    -- time, which is the thing the link check is here to prevent.
    continue when v_user_id = v_actor;
    continue when not public.is_linked_to(v_user_id);
    continue when exists (
      select 1 from public.thread_members tm
       where tm.thread_id = v_thread_id and tm.user_id = v_user_id and tm.left_at is null
    );

    insert into public.group_invites (group_id, invitee_id, invited_by)
      values (p_group_id, v_user_id, v_actor)
    on conflict (group_id, invitee_id) do nothing;

    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

comment on function public.invite_to_group(uuid, uuid[]) is
  'Puts the question to people you are linked to. Adds nobody. Returns how many were asked.';

revoke all on function public.invite_to_group(uuid, uuid[]) from public, anon;
grant execute on function public.invite_to_group(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Answering. The only path by which somebody becomes a member without a code,
-- and it carries the identity they picked on the way in.
-- ---------------------------------------------------------------------------
create or replace function public.respond_to_group_invite(
  p_invite_id uuid,
  p_accept boolean,
  p_identity text default 'first',
  p_handle text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_invite public.group_invites;
  v_thread_id uuid;
begin
  select * into v_invite from public.group_invites where id = p_invite_id;

  -- One message for "not yours" and "no such invitation", so neither answers
  -- a question about the other.
  if v_invite.id is null or v_invite.invitee_id <> v_actor then
    raise exception 'That invitation is no longer available.' using errcode = '42501';
  end if;

  if v_invite.responded_at is not null then
    raise exception 'You have already answered that invitation.' using errcode = '22023';
  end if;

  update public.group_invites
     set responded_at = now(), accepted = p_accept
   where id = p_invite_id;

  if not p_accept then
    return null;
  end if;

  select t.id into v_thread_id
    from public.threads t where t.group_id = v_invite.group_id;

  insert into public.thread_members (thread_id, user_id, role, identity, handle)
    values (v_thread_id, v_actor, 'member', p_identity,
            nullif(btrim(coalesce(p_handle, '')), ''))
  on conflict (thread_id, user_id) do update
    set left_at = null,
        identity = excluded.identity,
        handle = excluded.handle;

  return v_invite.group_id;
end;
$$;

comment on function public.respond_to_group_invite(uuid, boolean, text, text) is
  'Accepts or declines. Accepting is what adds the member, with the name they chose.';

revoke all on function public.respond_to_group_invite(uuid, boolean, text, text)
  from public, anon;
grant execute on function public.respond_to_group_invite(uuid, boolean, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- What the caller has been asked, and by whom.
--
-- The inviter is named through their own identity in that group, like everyone
-- else — and the group's name is all the invitation carries about it. Nothing
-- here lists who else is in it: the answer to "who will see me" is the member
-- count, and the names come after you have said yes.
-- ---------------------------------------------------------------------------
create or replace function public.my_group_invites()
returns table (
  invite_id uuid,
  group_id uuid,
  group_name text,
  invited_by_name text,
  member_count integer
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    i.id,
    g.id,
    g.name,
    public.community_display_name(inviter.identity, u.full_name, inviter.handle),
    (
      select count(*)::integer
        from public.thread_members tm
        join public.threads t on t.id = tm.thread_id
       where t.group_id = g.id and tm.left_at is null
    )
  from public.group_invites i
  join public.groups g on g.id = i.group_id
  left join public.threads t on t.group_id = g.id
  left join public.thread_members inviter
    on inviter.thread_id = t.id and inviter.user_id = i.invited_by
  left join public.users u on u.id = i.invited_by
  where i.invitee_id = auth.uid()
    and i.responded_at is null
  order by i.created_at desc;
$$;

comment on function public.my_group_invites() is
  'Unanswered invitations for the caller, with the inviter named by their own choice.';

revoke all on function public.my_group_invites() from public, anon;
grant execute on function public.my_group_invites() to authenticated;

-- ---------------------------------------------------------------------------
-- How many were asked and have not appeared.
--
-- A count and nothing more, which is the shape `ApiCommunityBoard` already
-- insists on: "naming who declined would undo the whole point of the opt-in,
-- so the shape cannot carry it even if a server wanted to send it." The same
-- is true of a group, so the same rule applies — this returns an integer and
-- there is no function anywhere that returns the names.
-- ---------------------------------------------------------------------------
create or replace function public.group_invited_not_joined(p_group_id uuid)
returns integer
language sql
security definer
stable
set search_path = ''
as $$
  select case
    when not public.is_group_admin(p_group_id) then 0
    else (
      select count(*)::integer
        from public.group_invites i
       where i.group_id = p_group_id
         and (i.responded_at is null or i.accepted = false)
    )
  end;
$$;

comment on function public.group_invited_not_joined(uuid) is
  'How many were asked and are not in. A count only — the names are nobody''s to have.';

revoke all on function public.group_invited_not_joined(uuid) from public, anon;
grant execute on function public.group_invited_not_joined(uuid) to authenticated;
