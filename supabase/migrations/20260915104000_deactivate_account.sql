-- ---------------------------------------------------------------------------
-- Deactivating an account, and coming back to it.
--
-- Not a delete. The screen offered one and never performed it — the card's own
-- comment said "nothing here actually deletes" — and a soft deactivation is
-- the better promise anyway: somebody who leaves in January and returns in
-- March gets their history back rather than an empty app and a shrug.
--
-- What it does is end every relationship and hide the account. What it does
-- not do is touch a single row of training data: the sessions, sets,
-- measurements and routines all stay exactly as they were, which is the whole
-- point of the word "deactivate".
--
-- Coming back is signing in. The auth account is untouched, so the same email
-- and password work, and `reactivate_account` clears the flag. Coach links do
-- not come back with it — a coaching relationship is between two people and
-- resuming it is their decision, not a side effect of a login.
-- ---------------------------------------------------------------------------

alter table public.users
  add column deactivated_at timestamptz;

comment on column public.users.deactivated_at is
  'Set while the account is dormant. Data is untouched; signing in clears it.';

-- Partial, because the question is only ever "is this one dormant" and almost
-- none of them are.
create index users_deactivated_idx on public.users (id) where deactivated_at is not null;

-- ---------------------------------------------------------------------------
-- Standing down.
--
-- Definer, because it ends links on both sides — a coach deactivating detaches
-- their clients, and a client deactivating detaches from their coach — and
-- neither is a row RLS lets the caller write from where they are standing.
-- ---------------------------------------------------------------------------
create or replace function public.deactivate_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  -- Every relationship ends, in both directions. Leaving a link live would
  -- mean a coach still reading the data of somebody who has left, which is
  -- the one thing deactivation must not allow.
  update public.coach_clients
     set status = 'ended',
         ended_at = now(),
         permissions = '{"workouts": false, "nutrition": false, "metrics": false,
                         "health": false, "monthly": false}'::jsonb,
         log_for = false
   where (client_id = v_actor or coach_id = v_actor)
     and status <> 'ended';

  -- The devices stop being live sessions, so a phone left signed in somewhere
  -- is not a way back in without going through auth again.
  update public.sessions
     set revoked_at = now()
   where user_id = v_actor and revoked_at is null;

  update public.users
     set deactivated_at = now()
   where id = v_actor;
end;
$$;

comment on function public.deactivate_account() is
  'Ends every relationship and marks the account dormant. Touches no training data.';

grant execute on function public.deactivate_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Coming back.
--
-- Called on sign-in rather than offered as a button: somebody who has signed
-- in has already answered the only question deactivation asks.
-- ---------------------------------------------------------------------------
create or replace function public.reactivate_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_was boolean;
begin
  if v_actor is null then
    raise exception 'you are not signed in' using errcode = '42501';
  end if;

  update public.users
     set deactivated_at = null
   where id = v_actor and deactivated_at is not null;

  get diagnostics v_was = row_count;

  -- True only when it actually woke something up, so the app can say "welcome
  -- back" once rather than on every launch.
  return v_was;
end;
$$;

comment on function public.reactivate_account() is
  'Clears the dormant flag. Returns true only if the account was dormant.';

grant execute on function public.reactivate_account() to authenticated;
