-- ---------------------------------------------------------------------------
-- Actually revoke anon's access to the authenticated-only functions.
--
-- 20260910093000 revoked EXECUTE `from public` and granted it to
-- `authenticated`, which is the standard recipe — and on Supabase it is not
-- enough. The platform ships ALTER DEFAULT PRIVILEGES granting EXECUTE on new
-- functions to anon, authenticated and service_role, so anon holds a grant of
-- its own that revoking PUBLIC does not touch.
--
-- Confirmed against the deployed project: after 20260910093000, an anon caller
-- still reached inside both functions. The two cache/ledger sweepers were
-- never exposed because their revokes happened to name anon explicitly.
--
-- The local harness now reproduces this — supabase/verify/00_stub_supabase.sql
-- applies the same default privileges, so a `from public` revoke fails the
-- checks instead of passing them.
-- ---------------------------------------------------------------------------

revoke all on function public.is_linked_to(uuid) from public, anon;
grant execute on function public.is_linked_to(uuid) to authenticated;

revoke all on function public.complete_password_reset_request() from public, anon;
grant execute on function public.complete_password_reset_request() to authenticated;

-- Left reachable by anon on purpose: someone who has forgotten their password
-- is by definition not signed in. Re-granted explicitly so the intent is
-- stated here rather than inherited from a platform default.
revoke all on function public.record_password_reset_request(text) from public;
grant execute on function public.record_password_reset_request(text) to anon, authenticated;
