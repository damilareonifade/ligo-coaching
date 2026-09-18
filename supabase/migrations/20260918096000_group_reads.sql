-- ---------------------------------------------------------------------------
-- Reading a group: who is in it, and what was said.
--
-- The one thing that cannot be done in the app, and the reason these functions
-- exist at all: resolving a display name.
--
-- `resolveDisplayName` in src/lib/community.ts does it today, and it takes the
-- real name as an argument. Doing that against a server would mean sending
-- every member's real name to every other member's phone so that each phone
-- could decide to render a handle instead — which is the whole identity choice
-- undone, in transit, before any screen gets a say. Somebody who picked
-- "Ironsmith" precisely so that no part of their real name is shown would have
-- shipped it to everyone in the group.
--
-- So the name is resolved here and the real one never leaves. The app renders
-- what it is given.
-- ---------------------------------------------------------------------------
create or replace function public.community_display_name(
  p_identity text,
  p_full_name text,
  p_handle text
)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_full_name, ''));
  v_parts text[];
begin
  if p_identity = 'real' then
    return v_name;
  end if;

  -- No fallback to the real name on an empty handle, deliberately and in step
  -- with the app: "the whole point of the option is that no part of the real
  -- name is shown, and a fallback would publish exactly what it was picked to
  -- withhold". The join constraint already refuses to store an empty one.
  if p_identity = 'handle' then
    return btrim(coalesce(p_handle, ''));
  end if;

  -- 'first', and anything unrecognised: "Maya Andersson" → "Maya A."
  v_parts := regexp_split_to_array(v_name, '\s+');
  if array_length(v_parts, 1) is null then
    return '';
  end if;
  if array_length(v_parts, 1) > 1 then
    return v_parts[1] || ' ' || upper(left(v_parts[array_length(v_parts, 1)], 1)) || '.';
  end if;

  return v_parts[1];
end;
$$;

comment on function public.community_display_name(text, text, text) is
  'How somebody is named in one group. Resolved here so the real name never leaves.';

grant execute on function public.community_display_name(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Every group the caller is in.
--
-- `security definer` for the same reason `my_threads` is: it reads other
-- members' `users` rows, which the caller has no policy to reach — they are
-- not linked to most of them and never will be. Authorization is the caller's
-- own membership row, which a group they are absent from cannot satisfy.
-- ---------------------------------------------------------------------------
create or replace function public.my_groups()
returns table (
  group_id uuid,
  thread_id uuid,
  name text,
  -- The door, shown to every member so any of them can bring somebody in.
  -- It admits people; it does not promote them.
  join_code text,
  owner_name text,
  member_count integer,
  is_admin boolean,
  my_identity text,
  my_display_name text,
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
    g.id,
    t.id,
    g.name,
    g.join_code,
    -- Through the founder's own identity choice in this group, like anybody
    -- else's. Making a group is not a reason to be named against your will.
    public.community_display_name(owner.identity, owner_user.full_name, owner.handle),
    (
      select count(*)::integer
        from public.thread_members m
       where m.thread_id = t.id and m.left_at is null
    ),
    me.role = 'admin',
    me.identity,
    public.community_display_name(me.identity, myself.full_name, me.handle),
    last.body,
    last.created_at,
    (
      last.created_at is not null
      and last.sender_id is distinct from auth.uid()
      and (me.last_read_at is null or last.created_at > me.last_read_at)
    )
  from public.thread_members me
  join public.threads t on t.id = me.thread_id and t.kind = 'group'
  join public.groups g on g.id = t.group_id
  join public.users myself on myself.id = me.user_id
  left join public.thread_members owner
    on owner.thread_id = t.id and owner.user_id = g.created_by and owner.left_at is null
  left join public.users owner_user on owner_user.id = owner.user_id
  left join lateral (
    select m.body, m.created_at, m.sender_id
      from public.messages m
     where m.thread_id = t.id
     order by m.created_at desc
     limit 1
  ) last on true
  where me.user_id = auth.uid()
    and me.left_at is null
  order by coalesce(last.created_at, g.created_at) desc;
$$;

comment on function public.my_groups() is
  'Every group the caller is in, with names already resolved through each identity choice.';

revoke all on function public.my_groups() from public, anon;
grant execute on function public.my_groups() to authenticated;

-- ---------------------------------------------------------------------------
-- Who is in one group.
--
-- Returns nothing at all to somebody who is not in it, rather than raising —
-- an error distinguishes "no such group" from "not yours", and a group is
-- invisible to outsiders by design.
-- ---------------------------------------------------------------------------
create or replace function public.group_members(p_group_id uuid)
returns table (
  user_id uuid,
  display_name text,
  is_admin boolean,
  is_coach boolean
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    tm.user_id,
    public.community_display_name(tm.identity, u.full_name, tm.handle),
    tm.role = 'admin',
    u.role = 'coach'
  from public.thread_members tm
  join public.threads t on t.id = tm.thread_id and t.kind = 'group'
  join public.users u on u.id = tm.user_id
  where t.group_id = p_group_id
    and tm.left_at is null
    and public.is_thread_member(t.id)
  order by tm.joined_at;
$$;

comment on function public.group_members(uuid) is
  'Members of one group, named through their own choices. Empty to an outsider.';

revoke all on function public.group_members(uuid) from public, anon;
grant execute on function public.group_members(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- What was said in one group.
--
-- Separate from `messages`, which the app reads directly for a direct thread,
-- because a group message carries a sender *name* — and that name is the one
-- thing the app must not be trusted to work out for itself.
-- ---------------------------------------------------------------------------
create or replace function public.group_messages(p_group_id uuid)
returns table (
  id uuid,
  sender_id uuid,
  sender_name text,
  is_coach boolean,
  body text,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    m.id,
    m.sender_id,
    -- A sender who has left the group keeps the name they had while in it;
    -- one who deleted their account has no row and no name to resolve.
    coalesce(public.community_display_name(sender.identity, u.full_name, sender.handle), ''),
    coalesce(u.role = 'coach', false),
    m.body,
    m.created_at
  from public.messages m
  join public.threads t on t.id = m.thread_id and t.kind = 'group'
  left join public.thread_members sender
    on sender.thread_id = t.id and sender.user_id = m.sender_id
  left join public.users u on u.id = m.sender_id
  where t.group_id = p_group_id
    and public.is_thread_member(t.id)
  order by m.created_at;
$$;

comment on function public.group_messages(uuid) is
  'One group''s turns, each named through the sender''s own identity choice.';

revoke all on function public.group_messages(uuid) from public, anon;
grant execute on function public.group_messages(uuid) to authenticated;
