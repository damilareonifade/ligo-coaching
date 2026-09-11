-- ---------------------------------------------------------------------------
-- Least privilege for functions, and one signature change.
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default, so
-- `grant execute ... to authenticated` in the earlier migrations added a
-- grant without removing the implicit one. Verified against the deployed
-- project: `anon` could call both `is_linked_to` and, worse,
-- `complete_password_reset_request` — letting an unauthenticated caller mark
-- any address's reset request as completed and corrupt the audit trail.
--
-- The two sweepers were already revoked explicitly and were never exposed.
-- ---------------------------------------------------------------------------

revoke all on function public.is_linked_to(uuid) from public;
grant execute on function public.is_linked_to(uuid) to authenticated;

revoke all on function public.record_password_reset_request(text) from public;
-- `anon` keeps this one on purpose: someone who has forgotten their password
-- is by definition not signed in.
grant execute on function public.record_password_reset_request(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- `complete_password_reset_request` loses its parameter.
--
-- Taking an address as an argument meant any caller who could execute it
-- could aim it at any row. The only address it should ever close out is the
-- caller's own, and the recovery session already carries that in its JWT —
-- so read it from there and leave nothing to tamper with.
-- ---------------------------------------------------------------------------
drop function if exists public.complete_password_reset_request(text);

create or replace function public.complete_password_reset_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
begin
  if caller_email = '' then
    raise exception 'No signed-in address to complete' using errcode = '42501';
  end if;

  update public.password_reset_requests
     set completed_at = now()
   where id = (
     select id
       from public.password_reset_requests
      where email = caller_email
        and completed_at is null
      order by requested_at desc
      limit 1
   );
end;
$$;

revoke all on function public.complete_password_reset_request() from public;
grant execute on function public.complete_password_reset_request() to authenticated;
