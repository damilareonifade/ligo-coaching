-- ---------------------------------------------------------------------------
-- Consent on the coach ↔ client link.
--
-- `coach_clients` already carried the right columns — status, permissions,
-- log_for — but its policies let either side write any of them:
--
--   for update using (auth.uid() in (coach_id, client_id))
--
-- which means a coach could set `permissions` to all true on their own row,
-- or flip `status` to 'active', and read a client's data the client never
-- agreed to share. The column comment said "what the client has agreed to
-- share"; nothing made that true.
--
-- Every domain table added after this one decides what a coach may see by
-- reading this row, so it has to be trustworthy before they exist rather
-- than after.
--
-- RLS alone cannot express these rules: a policy sees the old row in USING
-- and the new one in WITH CHECK, never both at once, so "the coach may not
-- change this particular column" needs a trigger — the same shape
-- `enforce_user_column_rules` already uses on public.users.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_coach_client_column_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  -- Migrations, and the security-definer functions that maintain this table,
  -- run as the owner and are deliberately unrestricted.
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A client attaching to a coach is consenting as they do it, so they may
    -- arrive with permissions already set. A coach inviting a client is not
    -- consenting on their behalf: their row starts empty and pending, and
    -- only the client can move it.
    if actor = new.coach_id then
      new.status := 'pending';
      new.permissions := '{"workouts": false, "nutrition": false, "metrics": false}'::jsonb;
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

  -- Everything below is the coach editing a row that is not theirs to consent
  -- on. They may end or pause a relationship — that is their side of it — and
  -- nothing else.
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

comment on function public.enforce_coach_client_column_rules() is
  'Keeps consent columns writable only by the client they belong to.';

create trigger coach_clients_enforce_column_rules
  before insert or update on public.coach_clients
  for each row execute function public.enforce_coach_client_column_rules();

-- ---------------------------------------------------------------------------
-- Deleting the row would be a way round all of the above: a coach could drop
-- a link they cannot edit and insert a fresh one. Ending is a state, not an
-- erasure — it keeps the history a client's sessions and check-ins hang off —
-- so the delete policy narrows to the client, who is entitled to be forgotten.
-- ---------------------------------------------------------------------------
drop policy if exists coach_clients_delete_either_side on public.coach_clients;

create policy coach_clients_delete_own_link on public.coach_clients
  for delete to authenticated
  using ((select auth.uid()) = client_id);
