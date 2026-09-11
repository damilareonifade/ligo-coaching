-- ---------------------------------------------------------------------------
-- Password reset audit and throttle.
--
-- One deliberate omission: there are no reset tokens in this table. GoTrue
-- already issues, hashes, expires and single-uses them, and a second token
-- store would be a worse copy of a solved problem — the failure mode being a
-- reset link that stays valid after the real one was consumed. The app calls
-- `resetPasswordForEmail`, and this table records that it happened so the
-- flow can be rate-limited and audited.
-- ---------------------------------------------------------------------------

create table public.password_reset_requests (
  id bigint generated always as identity primary key,
  -- Stored lowercased by the function below. Intentionally not a foreign key
  -- to public.users: a request for an unknown address must be recordable, or
  -- the throttle can be bypassed by guessing addresses.
  email text not null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint password_reset_email_length check (char_length(email) between 3 and 320)
);

comment on table public.password_reset_requests is
  'Audit trail and rate-limit ledger for password resets. Tokens live in GoTrue.';

-- The throttle query is "requests for this address in the last N minutes",
-- which this index answers directly.
create index password_reset_email_requested_idx
  on public.password_reset_requests (email, requested_at desc);

-- Retention sweep: the ledger only needs a recent window.
create index password_reset_requested_at_idx
  on public.password_reset_requests (requested_at);

-- ---------------------------------------------------------------------------
-- RLS with no policies at all: enabled means deny-by-default, and nothing
-- grants `anon`/`authenticated` a way in. The rows are an audit trail, and an
-- audit trail a client can read tells an attacker which addresses have
-- accounts. All access goes through the definer function below.
-- ---------------------------------------------------------------------------
alter table public.password_reset_requests enable row level security;

revoke all on public.password_reset_requests from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Records a reset attempt, or raises if the address has asked too often.
--
-- Returns nothing about whether the account exists — the caller gets the same
-- answer either way, so this cannot be used to enumerate users.
-- ---------------------------------------------------------------------------
create or replace function public.record_password_reset_request(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text := lower(btrim(p_email));
  recent integer;
begin
  if normalized = '' or position('@' in normalized) = 0 then
    raise exception 'A valid email address is required' using errcode = '22023';
  end if;

  select count(*) into recent
    from public.password_reset_requests
   where email = normalized
     and requested_at > now() - interval '15 minutes';

  if recent >= 3 then
    raise exception 'Too many reset requests for this address. Try again in 15 minutes.'
      using errcode = '54000';
  end if;

  insert into public.password_reset_requests (email) values (normalized);
end;
$$;

-- `anon` too: someone who has forgotten their password is by definition not
-- signed in.
grant execute on function public.record_password_reset_request(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Marks the most recent open request for an address as completed. Called
-- after the new password is accepted, so the ledger shows which requests were
-- actually used.
-- ---------------------------------------------------------------------------
create or replace function public.complete_password_reset_request(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text := lower(btrim(p_email));
begin
  update public.password_reset_requests
     set completed_at = now()
   where id = (
     select id
       from public.password_reset_requests
      where email = normalized
        and completed_at is null
      order by requested_at desc
      limit 1
   );
end;
$$;

grant execute on function public.complete_password_reset_request(text) to authenticated;

-- Retention: keep a quarter of history, no more. Operator-only, like the
-- cache sweeper.
create or replace function public.purge_old_password_reset_requests()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed bigint;
begin
  delete from public.password_reset_requests
   where requested_at < now() - interval '90 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_old_password_reset_requests() from public, anon, authenticated;
