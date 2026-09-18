-- ---------------------------------------------------------------------------
-- Making a group, joining one, running one, leaving one.
--
-- All of it through functions rather than policies. Every one of these writes
-- two or three tables at once — a group, its thread, a membership — and a
-- policy that allowed the client to do that directly would allow it to do half
-- of it: a group with no thread, or a thread nobody is in.
-- ---------------------------------------------------------------------------

/**
 * Six characters from an alphabet with no O/0 or I/1 in it, because this is
 * read off one screen and typed into another. The same shape as a coach's
 * invite code, for the same reason.
 */
create or replace function public.new_group_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_try integer := 0;
begin
  loop
    v_code := '';
    for _ in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    end loop;

    exit when not exists (select 1 from public.groups g where g.join_code = v_code);

    v_try := v_try + 1;
    -- A billion codes and a handful of groups; if this ever spins, something
    -- other than collision is wrong and a loop forever would hide it.
    if v_try > 20 then
      raise exception 'could not allocate a group code' using errcode = '55000';
    end if;
  end loop;

  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Creating one. The maker is its first admin and its first member, and picks
-- how they appear in the same breath — there is no moment where a group exists
-- with nobody in it.
-- ---------------------------------------------------------------------------
create or replace function public.create_group(
  p_name text,
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
  v_group_id uuid;
  v_thread_id uuid;
begin
  if v_actor is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  if btrim(coalesce(p_name, '')) = '' then
    raise exception 'Give the group a name.' using errcode = '22023';
  end if;

  insert into public.groups (name, created_by, join_code)
    values (btrim(p_name), v_actor, public.new_group_code())
    returning id into v_group_id;

  insert into public.threads (kind, group_id)
    values ('group', v_group_id)
    returning id into v_thread_id;

  insert into public.thread_members (thread_id, user_id, role, identity, handle)
    values (v_thread_id, v_actor, 'admin', p_identity, nullif(btrim(coalesce(p_handle, '')), ''));

  return v_group_id;
end;
$$;

comment on function public.create_group(text, text, text) is
  'Creates a group, its thread, and its first admin. Returns the group id.';

revoke all on function public.create_group(text, text, text) from public, anon;
grant execute on function public.create_group(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Joining by code.
--
-- Rate-limited on the same ledger as coach codes and for the same reason: the
-- code space is walkable otherwise. The ledger is the honest place to count,
-- because a wrong code has to leave a mark whether or not it found anything.
-- ---------------------------------------------------------------------------
create or replace function public.join_group(
  p_code text,
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
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_recent integer;
  v_group_id uuid;
  v_thread_id uuid;
begin
  if v_actor is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  if v_code = '' then
    raise exception 'Enter a group code.' using errcode = '22023';
  end if;

  select count(*) into v_recent
    from public.coach_code_lookups l
   where l.actor = v_actor and l.looked_up_at > now() - interval '1 hour';

  if v_recent >= 10 then
    raise exception 'Too many code attempts. Try again in an hour.'
      using errcode = '54000';
  end if;

  select g.id into v_group_id from public.groups g where g.join_code = v_code;

  insert into public.coach_code_lookups (actor, code, found)
  values (v_actor, v_code, v_group_id is not null);

  -- NULL, not an exception, and this is the whole reason the ledger above is
  -- worth writing. Raising here aborts the function, which rolls back the row
  -- that was just inserted — so every wrong guess would erase its own
  -- evidence and the rate limit would never count anything. `lookup_coach`
  -- returns empty for the same reason and says so in the same words.
  --
  -- The caller reads NULL as "no group has that code".
  if v_group_id is null then
    return null;
  end if;

  select t.id into v_thread_id
    from public.threads t where t.group_id = v_group_id;

  -- Rejoining after leaving is the same row coming back, not a second one —
  -- so the read mark and the identity they chose are still theirs.
  insert into public.thread_members (thread_id, user_id, role, identity, handle)
    values (v_thread_id, v_actor, 'member', p_identity,
            nullif(btrim(coalesce(p_handle, '')), ''))
  on conflict (thread_id, user_id) do update
    set left_at = null,
        identity = excluded.identity,
        handle = excluded.handle;

  return v_group_id;
end;
$$;

comment on function public.join_group(text, text, text) is
  'Joins a group by its code. NULL means no group has it — raising would undo the ledger row.';

revoke all on function public.join_group(text, text, text) from public, anon;
grant execute on function public.join_group(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Promoting somebody, and removing somebody.
-- ---------------------------------------------------------------------------
create or replace function public.set_group_admin(
  p_group_id uuid,
  p_user_id uuid,
  p_admin boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread_id uuid;
begin
  if not public.is_group_admin(p_group_id) then
    raise exception 'only an admin may change who runs this group'
      using errcode = '42501';
  end if;

  select t.id into v_thread_id from public.threads t where t.group_id = p_group_id;

  -- Standing down is `leave_group`'s business, and it is the one that knows
  -- what happens when the last admin goes.
  if not p_admin and p_user_id = auth.uid() then
    raise exception 'hand the group over by promoting somebody else first'
      using errcode = '22023';
  end if;

  update public.thread_members
     set role = case when p_admin then 'admin' else 'member' end
   where thread_id = v_thread_id and user_id = p_user_id and left_at is null;
end;
$$;

revoke all on function public.set_group_admin(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_group_admin(uuid, uuid, boolean) to authenticated;

create or replace function public.remove_group_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread_id uuid;
begin
  if not public.is_group_admin(p_group_id) then
    raise exception 'only an admin may remove somebody' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'use leave_group to leave a group you run' using errcode = '22023';
  end if;

  select t.id into v_thread_id from public.threads t where t.group_id = p_group_id;

  -- Marked as left rather than deleted: their messages stay, and a thread
  -- missing half its turns rewrites a conversation the others remember.
  update public.thread_members
     set left_at = now()
   where thread_id = v_thread_id and user_id = p_user_id and left_at is null;
end;
$$;

revoke all on function public.remove_group_member(uuid, uuid) from public, anon;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Leaving.
--
-- The last admin leaving takes the group with them, and that is deliberate: a
-- group nobody can rename, admit anybody to, or remove anybody from is not a
-- group, it is a room with a jammed door. The app warns before calling this,
-- and `would_orphan_group` is how it knows to.
-- ---------------------------------------------------------------------------
create or replace function public.would_orphan_group(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select public.is_group_admin(p_group_id)
     and not exists (
       select 1
         from public.thread_members tm
         join public.threads t on t.id = tm.thread_id
        where t.group_id = p_group_id
          and tm.role = 'admin'
          and tm.left_at is null
          and tm.user_id <> auth.uid()
     );
$$;

comment on function public.would_orphan_group(uuid) is
  'True when the caller is the only admin left, so leaving would delete the group.';

revoke all on function public.would_orphan_group(uuid) from public, anon;
grant execute on function public.would_orphan_group(uuid) to authenticated;

create or replace function public.leave_group(p_group_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread_id uuid;
  v_deleted boolean := false;
begin
  select t.id into v_thread_id
    from public.threads t
    join public.thread_members tm on tm.thread_id = t.id
   where t.group_id = p_group_id
     and tm.user_id = auth.uid()
     and tm.left_at is null;

  if v_thread_id is null then
    raise exception 'you are not in that group' using errcode = '42501';
  end if;

  if public.would_orphan_group(p_group_id) then
    -- The thread and every membership go with it, by cascade.
    delete from public.groups where id = p_group_id;
    return true;
  end if;

  update public.thread_members
     set left_at = now()
   where thread_id = v_thread_id and user_id = auth.uid();

  return v_deleted;
end;
$$;

comment on function public.leave_group(uuid) is
  'Leaves a group. Returns true when leaving deleted it — the caller was its last admin.';

revoke all on function public.leave_group(uuid) from public, anon;
grant execute on function public.leave_group(uuid) to authenticated;
