\pset pager off
\set QUIET on

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'sam@ligo.app',
   '{"role":"coach","full_name":"Sam Okafor"}'),
  ('22222222-2222-2222-2222-222222222222', 'maya@example.com',
   '{"name":"Maya Andersson","picture":"https://example.com/m.png"}'),
  ('33333333-3333-3333-3333-333333333333', 'stranger@example.com', '{"role":"client"}');

\echo ''
\echo '=== 1. signup trigger: role + confirmation resolved per provider ==='
select email, role, role_confirmed, full_name, avatar_url is not null as has_avatar
  from public.users order by email;

\echo ''
\echo '=== 2. provider sync fills blanks, never overwrites app-set data ==='
update public.users set full_name = 'Maya A.' where email = 'maya@example.com';
update auth.users set raw_user_meta_data = '{"name":"IGNORED"}' where email = 'maya@example.com';
select full_name as should_be_maya_a from public.users where email = 'maya@example.com';

\echo ''
\echo '=== 3. RLS: client sees only their own row (expect 1) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select count(*) as visible_rows from public.users;

\echo ''
\echo '=== 4. role escalation refused once confirmed (expect ERROR) ==='
update public.users set role_confirmed = true where id = auth.uid();
update public.users set role = 'coach' where id = auth.uid();

\echo ''
\echo '=== 5. email not client-writable (expect ERROR) ==='
update public.users set email = 'attacker@example.com' where id = auth.uid();

\echo ''
\echo '=== 6. client cannot create a table (expect ERROR) ==='
create table public.should_not_exist (id int);

\echo ''
\echo '=== 7. cache: upsert wins, expired row filtered (expect roster n=9 only) ==='
insert into public.cache (user_id, key, value, expires_at)
  values (auth.uid(), 'roster', '{"n":3}', now() + interval '1 hour'),
         (auth.uid(), 'stale', '{"n":1}', now() - interval '1 minute');
insert into public.cache (user_id, key, value, expires_at)
  values (auth.uid(), 'roster', '{"n":9}', now() + interval '1 hour')
  on conflict (user_id, key) do update set value = excluded.value;
select key, value from public.cache
  where user_id = auth.uid() and (expires_at is null or expires_at > now()) order by key;

\echo ''
\echo '=== 8. sessions: one row per device, last_seen bumped (expect 1 / 1.0.1 / t) ==='
insert into public.sessions (user_id, device_id, device_name, platform, app_version)
  values (auth.uid(), 'device-a', 'iPhone 17 Pro', 'ios', '1.0.0');
insert into public.sessions (user_id, device_id, device_name, platform, app_version)
  values (auth.uid(), 'device-a', 'iPhone 17 Pro', 'ios', '1.0.1')
  on conflict (user_id, device_id) do update set app_version = excluded.app_version;
select count(*) as rows_for_device, max(app_version) as version,
       bool_or(last_seen_at > created_at) as last_seen_bumped
  from public.sessions where user_id = auth.uid();

\echo ''
\echo '=== 9. reset throttle: 3 allowed then ERROR; ledger unreadable ==='
reset role;
set role anon;
select public.record_password_reset_request('Maya@Example.com ') as first;
select public.record_password_reset_request('maya@example.com') as second;
select public.record_password_reset_request('maya@example.com') as third;
select public.record_password_reset_request('maya@example.com') as fourth_should_fail;
select count(*) as ledger_rows_visible_to_anon from public.password_reset_requests;

\echo ''
\echo '=== 10. coach sees own + linked client, not the stranger (expect 2) ==='
reset role;
insert into public.coach_clients (coach_id, client_id, status, accepted_at)
  values ('11111111-1111-1111-1111-111111111111',
          '22222222-2222-2222-2222-222222222222','active', now());
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select email from public.users order by email;

\echo ''
\echo '=== 11. sweeper reclaims expired cache (expect 1 removed) ==='
reset role;
reset request.jwt.claims;
select public.purge_expired_cache() as rows_removed;

\echo ''
\echo '=== 12. anon cannot execute the authenticated-only functions (expect ERRORs) ==='
reset role;
reset request.jwt.claims;
set role anon;
select public.is_linked_to('11111111-1111-1111-1111-111111111111');
select public.complete_password_reset_request();

\echo ''
\echo '=== 13. a recovery session closes out its OWN request, by JWT (expect 1 row) ==='
reset role;
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","email":"maya@example.com"}';
select public.complete_password_reset_request();
reset role;
select count(*) as completed_rows from public.password_reset_requests where completed_at is not null;

\echo ''
\echo '=== 14. backfill covers an account created before the trigger existed ==='
reset role;
reset request.jwt.claims;
-- Simulate a Google sign-in that happened while the schema did not exist.
drop trigger on_auth_user_created on auth.users;
insert into auth.users (id, email, raw_user_meta_data)
  values ('44444444-4444-4444-4444-444444444444', 'early@example.com',
          '{"name":"Early Adopter","picture":"https://example.com/e.png"}');
select count(*) as profile_before_backfill from public.users where email = 'early@example.com';

select public.backfill_missing_profiles() as rows_created;
select email, role, role_confirmed, full_name, avatar_url is not null as has_avatar
  from public.users where email = 'early@example.com';

\echo '--- and re-running it creates nothing (expect 0) ---'
select public.backfill_missing_profiles() as second_run;
