-- ---------------------------------------------------------------------------
-- Groups.
--
-- A group is a thread with a name, an owner and more than two people in it.
-- The spine from `20260918090000_threads.sql` already holds the conversation,
-- the membership and the read marks, so nothing here duplicates any of it —
-- `threads.kind` becomes 'group', `thread_members.role` starts meaning
-- something, and `groups` carries only what a direct thread has no use for.
--
-- A group belongs to whoever made it, not to a coach. Clients form them with
-- other clients, coaches with their clients, clients with a coach — the app's
-- existing shapes assume otherwise (nine of them carry a `coachName`) and that
-- is a front-end correction, not a schema one.
--
-- Detaching from a coach removes nobody from any group. The two relationships
-- are unrelated: `coach_clients` says who may read whose training, and
-- membership here says who is in a conversation.
-- ---------------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- NULL once they delete their account. The group outlives its founder —
  -- there are other admins by then, or it was already gone. See
  -- `leave_group` for what happens to the last one.
  created_by uuid references public.users (id) on delete set null,
  /**
   * The door. Not the relationship — the same distinction `users.invite_code`
   * draws, and for the same reason: sharing it lets somebody in, and changing
   * it does not put anybody out.
   *
   * A code rather than picking people from a list, because there is no list to
   * pick from. A coach has a roster; a client has nobody they can enumerate,
   * and a box that looked somebody up by email would be an account checker —
   * which this schema refuses elsewhere in exactly these words.
   */
  join_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint groups_name_not_blank check (btrim(name) <> ''),
  constraint groups_name_length check (length(name) <= 60)
);

comment on table public.groups is
  'A named conversation belonging to whoever made it. Joined with a code.';

comment on column public.groups.join_code is
  'The door, not the relationship. Rolling it locks nobody out who is already in.';

-- ---------------------------------------------------------------------------
-- The thread a group holds, and how somebody appears in it.
-- ---------------------------------------------------------------------------
alter table public.threads
  add column group_id uuid references public.groups (id) on delete cascade;

-- A group has exactly one conversation.
create unique index threads_group_key
  on public.threads (group_id)
  where kind = 'group';

/**
 * `threads_no_self_thread` said `coach_id is distinct from client_id`, which
 * is false when both are NULL — and both are NULL on every group thread. The
 * constraint rejected the entire feature, and it was written before there was
 * anything for it to reject.
 *
 * It only ever had one job: a direct thread with the same person on both
 * sides. Said that way it is true of a group by construction.
 */
alter table public.threads drop constraint threads_no_self_thread;

alter table public.threads add constraint threads_no_self_thread
  check (kind <> 'direct' or coach_id <> client_id);

-- Rewritten rather than added to: the original said a non-direct thread has
-- neither side, and now it has to say what it does have instead.
alter table public.threads drop constraint threads_direct_has_two_sides;

alter table public.threads add constraint threads_shape_matches_kind check (
  (kind = 'direct'
     and coach_id is not null and client_id is not null and group_id is null)
  or (kind = 'group'
     and coach_id is null and client_id is null and group_id is not null)
);

/**
 * How this member is named in this group.
 *
 * On the membership row rather than on the person, because the choice is per
 * group and is not inherited: "appearing as 'Maya A.' among six people you
 * train with is a different decision from appearing as 'Maya A.' among
 * thirty, and the app is not entitled to make the second one on the strength
 * of the first."
 *
 * NULL on a direct thread, where there is nobody to be anonymous from.
 */
alter table public.thread_members
  add column identity text,
  add column handle text;

alter table public.thread_members add constraint thread_members_identity_known
  check (identity is null or identity in ('real', 'first', 'handle'));

-- A handle is required by the one identity that has nothing else to show, and
-- meaningless under the other two. `resolveDisplayName` deliberately does not
-- fall back to the real name when it is blank — "the whole point of the option
-- is that no part of the real name is shown" — so an empty one must not be
-- storable in the first place.
alter table public.thread_members add constraint thread_members_handle_matches_identity
  check (
    (identity = 'handle' and handle is not null and btrim(handle) <> '')
    or (identity is distinct from 'handle' and handle is null)
  );

-- ---------------------------------------------------------------------------
-- Who may do what.
--
-- `is_thread_member` already answers reading and writing for every thread,
-- group ones included — that is the point of one spine. This is the extra
-- question a group asks and a direct thread never does.
-- ---------------------------------------------------------------------------
create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
      from public.thread_members tm
      join public.threads t on t.id = tm.thread_id
     where t.group_id = p_group_id
       and tm.user_id = auth.uid()
       and tm.role = 'admin'
       and tm.left_at is null
  );
$$;

comment on function public.is_group_admin(uuid) is
  'True when the caller runs this group. Definer, for the same recursion reason as is_thread_member.';

grant execute on function public.is_group_admin(uuid) to authenticated;

alter table public.groups enable row level security;

-- Members see the group they are in. Nobody else sees it at all — not its
-- name, not its size. A group is not public and has no listing.
create policy groups_select_as_member on public.groups
  for select to authenticated
  using (
    exists (
      select 1 from public.threads t
       where t.group_id = groups.id and public.is_thread_member(t.id)
    )
  );

-- Renaming it is an admin's to do; everything else goes through a function.
create policy groups_update_as_admin on public.groups
  for update to authenticated
  using (public.is_group_admin(id))
  with check (public.is_group_admin(id));

revoke all on public.groups from anon, authenticated;
grant select, update on public.groups to authenticated;

-- ---------------------------------------------------------------------------
-- `groups_update_as_admin` is row-scoped. Without this an admin could rewrite
-- the `join_code` to one they had seen elsewhere, or reassign `created_by`.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_group_column_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.id <> old.id
     or new.created_by is distinct from old.created_by
     or new.join_code <> old.join_code
     or new.created_at <> old.created_at then
    raise exception 'only name may be changed' using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger groups_column_rules
  before update on public.groups
  for each row execute function public.enforce_group_column_rules();
