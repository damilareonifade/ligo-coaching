\pset pager off
\set QUIET on

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'sam@settrack.app',
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

\echo ''
\echo '=== 15. consent: a coach inviting cannot pre-grant themselves access ==='
reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
-- The coach asks for everything; the trigger resets the row to an empty invite.
-- A pair the earlier checks have not linked, so this tests the insert itself.
insert into public.coach_clients (coach_id, client_id, status, permissions, log_for, accepted_at)
values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333',
        'active', '{"workouts":true,"nutrition":true,"metrics":true}'::jsonb, true, now());
reset role;
select status, permissions, log_for, accepted_at is null as not_accepted
  from public.coach_clients
 where client_id = '33333333-3333-3333-3333-333333333333';

\echo ''
\echo '=== 16. the client grants, and that sticks (expect active + workouts true) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
update public.coach_clients
   set status = 'active',
       permissions = '{"workouts":true,"nutrition":false,"metrics":false}'::jsonb,
       accepted_at = now();
reset role;
select status, permissions ->> 'workouts' as workouts, accepted_at is not null as accepted
  from public.coach_clients
 where client_id = '33333333-3333-3333-3333-333333333333';

\echo ''
\echo '=== 17. coach cannot widen permissions afterwards (expect ERROR) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.coach_clients
   set permissions = '{"workouts":true,"nutrition":true,"metrics":true}'::jsonb
 where client_id = '33333333-3333-3333-3333-333333333333';

\echo ''
\echo '=== 18. coach cannot grant themselves logging rights (expect ERROR) ==='
update public.coach_clients set log_for = true
 where client_id = '33333333-3333-3333-3333-333333333333';

\echo ''
\echo '=== 19. coach MAY end the relationship (expect ended) ==='
update public.coach_clients set status = 'ended'
 where client_id = '33333333-3333-3333-3333-333333333333';
reset role;
select status from public.coach_clients
 where client_id = '33333333-3333-3333-3333-333333333333';

\echo ''
\echo '=== 20. coach cannot re-activate it (expect ERROR) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.coach_clients set status = 'active'
 where client_id = '33333333-3333-3333-3333-333333333333';

\echo ''
\echo '=== 21. coach cannot delete the link to start fresh (expect 0 rows deleted) ==='
delete from public.coach_clients
 where client_id = '33333333-3333-3333-3333-333333333333';
reset role;
select count(*) as link_survives from public.coach_clients
 where client_id = '33333333-3333-3333-3333-333333333333';

-- ---------------------------------------------------------------------------
-- Training. The properties worth asserting are the negative ones: a copy is
-- a copy, and a coach sees only what they were given or granted.
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 22. setup: Sam writes a program, Maya and the stranger hold copies ==='
reset role;
reset request.jwt.claims;
insert into public.programs (id, coach_id, name, weeks, sessions_per_week, version)
values ('aaaaaaaa-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111', 'Upper/Lower 4×', 12, 4, 1);
insert into public.program_routines (id, program_id, name, order_index)
values ('bbbbbbbb-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001', 'Upper A', 0);
insert into public.routine_instances (id, client_id, program_routine_id, coach_id, name, base_version)
values ('cccccccc-0000-0000-0000-000000000001',
        '22222222-2222-2222-2222-222222222222',
        'bbbbbbbb-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111', 'Upper/Lower 4× · Upper A', 1),
       ('cccccccc-0000-0000-0000-000000000002',
        '33333333-3333-3333-3333-333333333333',
        'bbbbbbbb-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111', 'Upper/Lower 4× · Upper A', 1);
-- And one Maya built herself.
insert into public.routine_instances (id, client_id, name)
values ('cccccccc-0000-0000-0000-000000000003',
        '22222222-2222-2222-2222-222222222222', 'Push Pull Legs');
select count(*) as instances from public.routine_instances;

\echo ''
\echo '=== 23. a client sees only their own copies (expect 2, not 3) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select count(*) as maya_sees from public.routine_instances;

\echo ''
\echo '=== 24. editing one copy leaves the other alone (expect 1 changed) ==='
update public.routine_instances set name = 'My version', diverged = true
 where id = 'cccccccc-0000-0000-0000-000000000001';
reset role;
select client_id::text = '22222222-2222-2222-2222-222222222222' as is_maya, name, diverged
  from public.routine_instances
 where program_routine_id = 'bbbbbbbb-0000-0000-0000-000000000001'
 order by 1 desc;

\echo ''
\echo '=== 25. a client cannot touch the coach''s template (expect 0 rows) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select count(*) as templates_visible from public.programs;

\echo ''
\echo '=== 26. and cannot write one either (expect ERROR) ==='
insert into public.programs (coach_id, name)
values ('22222222-2222-2222-2222-222222222222', 'Mine now');

\echo ''
\echo '=== 27. the coach sees what they assigned, not what she built (expect 2) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select count(*) as coach_sees from public.routine_instances;

\echo ''
\echo '=== 28. the coach may edit an assigned copy (expect note set) ==='
update public.routine_instances set note = 'Lighter this week'
 where id = 'cccccccc-0000-0000-0000-000000000001';
reset role;
select note from public.routine_instances where id = 'cccccccc-0000-0000-0000-000000000001';

\echo ''
\echo '=== 29. but not a routine the client built (expect 0 rows changed) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.routine_instances set name = 'Not yours'
 where id = 'cccccccc-0000-0000-0000-000000000003';
reset role;
select name as should_be_unchanged from public.routine_instances
 where id = 'cccccccc-0000-0000-0000-000000000003';

\echo ''
\echo '=== 30. workouts are private until the client shares them (expect 0) ==='
reset role;
insert into public.workout_sessions (client_id, routine_instance_id, title, finished_at)
values ('33333333-3333-3333-3333-333333333333',
        'cccccccc-0000-0000-0000-000000000002', 'Upper A', now());
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
-- The stranger ended their link back in check 19, so nothing is shared.
select count(*) as coach_sees_workouts from public.workout_sessions;

\echo ''
\echo '=== 31. a deleted program leaves the copies standing (expect 2, both orphaned) ==='
-- A coach deleting a template must not delete training a client is in the
-- middle of. The copy survives and simply stops having a template behind it.
reset role;
delete from public.programs where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select
  count(*) as instances_survive,
  count(*) filter (where program_routine_id is null) as template_link_cleared,
  count(*) filter (where base_version is not null) as still_know_where_from
  from public.routine_instances
 where name in ('My version', 'Upper/Lower 4× · Upper A');

-- ---------------------------------------------------------------------------
-- The verbs. Each is many rows that must land together; what is worth
-- asserting is that they land for the right person and nobody else.
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 32. setup: a fresh program, and Maya re-linked to Sam ==='
reset role;
reset request.jwt.claims;
delete from public.routine_instances;
delete from public.programs;
update public.coach_clients set status = 'active'
 where client_id = '22222222-2222-2222-2222-222222222222';
insert into public.programs (id, coach_id, name, weeks, sessions_per_week)
values ('aaaaaaaa-0000-0000-0000-00000000000a',
        '11111111-1111-1111-1111-111111111111', 'Push Pull', 8, 3);
insert into public.program_routines (id, program_id, name, order_index) values
  ('bbbbbbbb-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Push', 0),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Pull', 1);
insert into public.program_blocks (program_routine_id, name, scheme, target_kg, order_index) values
  ('bbbbbbbb-0000-0000-0000-00000000000a', 'Bench press', '4 × 8', 60, 0),
  ('bbbbbbbb-0000-0000-0000-00000000000a', 'Overhead press', '3 × 10', 40, 1),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'Barbell row', '4 × 8', 55, 0);
select count(*) as blocks from public.program_blocks;

\echo ''
\echo '=== 33. assign: one copy per routine, blocks copied (expect 2 created, 3 blocks) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.assign_program('aaaaaaaa-0000-0000-0000-00000000000a',
  array['22222222-2222-2222-2222-222222222222']::uuid[]) as created;
reset role;
select i.name, count(b.id) as blocks
  from public.routine_instances i
  left join public.routine_blocks b on b.routine_instance_id = i.id
 group by i.name order by i.name;

\echo ''
\echo '=== 34. assigning twice gives nobody a second copy (expect 0) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.assign_program('aaaaaaaa-0000-0000-0000-00000000000a',
  array['22222222-2222-2222-2222-222222222222']::uuid[]) as created_again;

\echo ''
\echo '=== 35. a coach cannot assign someone else''s program (expect ERROR) ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.assign_program('aaaaaaaa-0000-0000-0000-00000000000a',
  array['22222222-2222-2222-2222-222222222222']::uuid[]);

\echo ''
\echo '=== 36. Maya edits her copy, then Sam publishes (expect 2 asked) ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
update public.routine_blocks set scheme = '5 × 5'
 where name = 'Bench press';
update public.routine_instances set diverged = true where name like 'Push Pull%Push';
reset role;
update public.program_blocks set scheme = '4 × 6', target_kg = 65 where name = 'Bench press';
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.publish_program('aaaaaaaa-0000-0000-0000-00000000000a') as asked;

\echo ''
\echo '=== 37. nothing moved on its own — her copy still says 5 × 5 ==='
reset role;
select b.scheme as maya_still_has from public.routine_blocks b where b.name = 'Bench press';
select u.summary from public.routine_updates u
  join public.routine_instances i on i.id = u.routine_instance_id
 where i.name like '%Push';

\echo ''
\echo '=== 38. she declines: her copy stands, the proposal is gone ==='
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.decide_routine_update(
  (select id from public.routine_instances where name like '%Push'), false) as decided;
reset role;
select b.scheme as still_hers from public.routine_blocks b where b.name = 'Bench press';
select count(*) as proposals_left from public.routine_updates u
  join public.routine_instances i on i.id = u.routine_instance_id where i.name like '%Push';

\echo ''
\echo '=== 39. on the other copy she accepts (expect the template''s 4 × 6 / 65) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.decide_routine_update(
  (select id from public.routine_instances where name like '%Pull'), true) as decided;
reset role;
select b.name, b.scheme, b.target_kg, i.diverged, i.base_version
  from public.routine_blocks b
  join public.routine_instances i on i.id = b.routine_instance_id
 where i.name like '%Pull';

\echo ''
\echo '=== 40. a client cannot answer for somebody else (expect ERROR) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select public.decide_routine_update(
  (select id from public.routine_instances where name like '%Push'), true);

\echo ''
-- Her copy, not the template: she declined the 4 × 6 in check 38, so the
-- workout opens at the 5 × 5 she set. That is the whole point of the copy.
\echo '=== 41. start_workout builds from HER copy (expect 5 × 5 at 60) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.start_workout(
  (select id from public.routine_instances where name like '%Push')) is not null as started;
reset role;
select e.name, count(s.id) as sets, min(s.reps) as reps, min(s.weight_kg) as kg
  from public.workout_exercises e
  join public.workout_sets s on s.workout_exercise_id = e.id
 group by e.name order by e.name;

\echo ''
\echo '=== 42. an empty workout has no exercises, and is still yours (expect 0) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.start_workout(null, 'Quick workout') is not null as started_empty;
reset role;
select count(*) as exercises_in_empty from public.workout_exercises e
  join public.workout_sessions s on s.id = e.workout_session_id
 where s.title = 'Quick workout';

\echo ''
\echo '=== 43. unassign takes the copies back (expect 0 left) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.unassign_program('aaaaaaaa-0000-0000-0000-00000000000a',
  array['22222222-2222-2222-2222-222222222222']::uuid[]) as removed;
reset role;
select count(*) as instances_left from public.routine_instances;

\echo ''
\echo '=== 44. last_completed_at is derived, and only from FINISHED workouts ==='
-- Clear the workouts earlier checks left behind so the counts below are this
-- check's own, and re-assign as the coach — assign_program reads auth.uid().
reset role;
reset request.jwt.claims;
delete from public.workout_sessions;
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.assign_program('aaaaaaaa-0000-0000-0000-00000000000a',
  array['22222222-2222-2222-2222-222222222222']::uuid[]) as reassigned;
reset role;
-- One finished eight days ago, one still running. Only the finished one counts.
insert into public.workout_sessions (client_id, routine_instance_id, title, started_at, finished_at)
select '22222222-2222-2222-2222-222222222222', i.id, i.name,
       now() - interval '8 days', now() - interval '8 days'
  from public.routine_instances i where i.name like '%Push';
insert into public.workout_sessions (client_id, routine_instance_id, title)
select '22222222-2222-2222-2222-222222222222', i.id, i.name
  from public.routine_instances i where i.name like '%Pull';
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select name, last_completed_at is not null as has_been_done
  from public.routine_instance_progress order by name;

\echo ''
\echo '=== 45. the view obeys RLS — a stranger sees none of it (expect 0) ==='
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select count(*) as stranger_sees from public.routine_instance_progress;

\echo ''
\echo '=== 46. weekly_progress ignores last week (expect 0 done, target 3) ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select * from public.weekly_progress('22222222-2222-2222-2222-222222222222');

\echo ''
\echo '=== 47. finishing the open one counts it (expect 1 done) ==='
update public.workout_sessions set finished_at = now() where finished_at is null;
select done from public.weekly_progress('22222222-2222-2222-2222-222222222222');

\echo ''
\echo '=== 48. nobody reads another client''s week (expect 0 rows) ==='
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select count(*) as rows_returned
  from public.weekly_progress('22222222-2222-2222-2222-222222222222');

\echo ''
\echo '=== 49. a client builds their own routine (expect templateId null, 2 blocks) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.save_routine(
  'Saturday arms',
  '[{"name":"Curl","scheme":"4 × 12","rpe":"RPE 8","target_kg":20,"note":null,"order_index":0},
    {"name":"Pushdown","scheme":"3 × 15","rpe":"","target_kg":null,"note":"slow","order_index":1}]'::jsonb
) is not null as saved;
select i.name, i.program_routine_id is null as is_own, i.diverged, count(b.id) as blocks
  from public.routine_instances i
  left join public.routine_blocks b on b.routine_instance_id = i.id
 where i.name = 'Saturday arms'
 group by i.name, i.program_routine_id, i.diverged;

\echo ''
\echo '=== 50. saving again replaces the blocks rather than appending (expect 1) ==='
select public.save_routine(
  'Saturday arms',
  '[{"name":"Curl","scheme":"5 × 5","rpe":"","target_kg":0,"note":"","order_index":0}]'::jsonb,
  'short one',
  (select id from public.routine_instances where name = 'Saturday arms')
) is not null as saved_again;
select b.name, b.scheme, b.target_kg, b.note, i.note as routine_note, i.diverged
  from public.routine_blocks b
  join public.routine_instances i on i.id = b.routine_instance_id
 where i.name = 'Saturday arms';

\echo ''
\echo '=== 51. editing a coach''s copy marks it diverged (expect true) ==='
select public.save_routine(
  'Renamed push',
  '[{"name":"Bench","scheme":"3 × 3","rpe":"","target_kg":80,"note":null,"order_index":0}]'::jsonb,
  null,
  (select id from public.routine_instances where name like '%Push')
) is not null as saved_copy;
select name, diverged, program_routine_id is not null as from_coach
  from public.routine_instances where name = 'Renamed push';

\echo ''
\echo '=== 52. another client''s routine is not saveable (expect ERROR) ==='
-- Read the id while it is still visible: to the stranger below the row does
-- not exist, and a subquery returning NULL would quietly create a routine
-- rather than fail the thing this check is about.
select id as arms_id from public.routine_instances where name = 'Saturday arms' \gset
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select public.save_routine('Hijacked', '[]'::jsonb, null, :'arms_id'::uuid);

\echo ''
\echo '=== 53. a blank name is refused before the constraint sees it (expect ERROR) ==='
select public.save_routine('   ', '[]'::jsonb);

\echo ''
\echo '=== 54. a lift added mid-workout lands last, with its sets (expect order 1) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
-- Started from the copy check 51 rewrote, which holds exactly one exercise —
-- so a lift added now belongs at index 1, after what the lifter has been
-- through rather than ahead of it.
select public.start_workout(
  (select id from public.routine_instances where name = 'Renamed push')) as session_id \gset
select public.add_session_exercise(
  :'session_id'::uuid,
  '44444444-4444-4444-4444-444444444444',
  '  Face pull  ',
  '[{"n":1,"weight_kg":15,"reps":12,"completed":false,"is_pr":false},
    {"n":2,"weight_kg":15,"reps":12,"completed":false,"is_pr":false}]'::jsonb
);
select e.name, e.order_index, e.coach_note is null as no_cue, count(s.id) as sets
  from public.workout_exercises e
  left join public.workout_sets s on s.workout_exercise_id = e.id
 where e.workout_session_id = :'session_id'::uuid
 group by e.name, e.order_index, e.coach_note
 order by e.order_index;

\echo ''
\echo '=== 55. nobody adds a lift to someone else''s workout (expect ERROR) ==='
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select public.add_session_exercise(
  :'session_id'::uuid,
  '55555555-5555-5555-5555-555555555555',
  'Hijacked',
  '[]'::jsonb
);

\echo ''
\echo '=== 56. a coach saves a program, routines and exercises in one call ==='
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.save_program(
  'Hypertrophy block', 6, 4,
  '[{"name":"Upper A","order_index":0,
     "blocks":[{"name":"Bench","scheme":"4 × 8","rpe":"RPE 8","target_kg":70,"note":null,"order_index":0},
               {"name":"Row","scheme":"4 × 10","rpe":"","target_kg":null,"note":" brace ","order_index":1}]},
    {"name":"Lower A","order_index":1,
     "blocks":[{"name":"Squat","scheme":"5 × 5","rpe":"","target_kg":0,"note":"","order_index":0}]}]'::jsonb
) as program_id \gset
select p.name, p.weeks, p.sessions_per_week, p.status, p.has_draft_changes,
       count(distinct r.id) as routines, count(b.id) as blocks
  from public.programs p
  left join public.program_routines r on r.program_id = p.id
  left join public.program_blocks b on b.program_routine_id = r.id
 where p.id = :'program_id'::uuid
 group by p.name, p.weeks, p.sessions_per_week, p.status, p.has_draft_changes;

\echo ''
\echo '=== 57. renaming a routine keeps the row a client is linked through ==='
select id as upper_id from public.program_routines
 where program_id = :'program_id'::uuid and order_index = 0 \gset
select public.assign_program(:'program_id'::uuid,
  array['22222222-2222-2222-2222-222222222222']::uuid[]) as assigned;
select public.save_program(
  'Hypertrophy block', 6, 4,
  '[{"name":"Push day","order_index":0,"blocks":[]},
    {"name":"Lower A","order_index":1,"blocks":[]}]'::jsonb,
  null, :'program_id'::uuid
) is not null as resaved;
select r.name as renamed, (r.id = :'upper_id'::uuid) as same_row,
       (select count(*) from public.routine_instances i where i.program_routine_id = r.id)
         as copies_still_linked
  from public.program_routines r
 where r.program_id = :'program_id'::uuid and r.order_index = 0;

\echo ''
\echo '=== 58. dropping a routine leaves the copy standing, template-less ==='
select public.save_program(
  'Hypertrophy block', 6, 4,
  '[{"name":"Push day","order_index":0,"blocks":[]}]'::jsonb,
  null, :'program_id'::uuid
) is not null as shrunk;
select count(*) as routines_left from public.program_routines
 where program_id = :'program_id'::uuid;
select name, program_routine_id is null as template_gone, base_version is not null as knows_where_from
  from public.routine_instances
 where name like 'Hypertrophy%' order by name;

\echo ''
\echo '=== 59. another coach''s program is not saveable (expect ERROR) ==='
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select public.save_program('Stolen', 4, 3, '[]'::jsonb, null, :'program_id'::uuid);

\echo ''
\echo '=== 60. start_workout without a session says so, and writes nothing ==='
reset role;
reset request.jwt.claims;
select count(*) as sessions_before from public.workout_sessions;
set role authenticated;
select public.start_workout();
reset role;
select count(*) as sessions_after from public.workout_sessions;

\echo ''
\echo '=== 61. a coach is issued a code, a client is not ==='
reset role;
reset request.jwt.claims;
select email,
       invite_code is not null as has_code,
       invite_code ~ '^[A-Z]{3}-[0-9A-HJ-NP-Z]{4}$' as well_formed
  from public.users where email in ('sam@settrack.app', 'maya@example.com') order by email;

\echo ''
\echo '=== 62. a code is issued on becoming a coach, not only at signup ==='
insert into auth.users (id, email, raw_user_meta_data)
  values ('66666666-6666-6666-6666-666666666666', 'late@example.com', '{"name":"Late Bloomer"}'),
         ('77777777-7777-7777-7777-777777777777', 'newbie@example.com', '{"name":"New Bie"}');
-- Check 14 dropped the signup trigger, so these need the backfill the same way
-- an account created before the schema existed would.
select public.backfill_missing_profiles() as profiles_created;
select invite_code is null as client_has_none from public.users where email = 'late@example.com';
update public.users set role = 'coach', role_confirmed = true where email = 'late@example.com';
select left(invite_code, 4) as prefix from public.users where email = 'late@example.com';

\echo ''
\echo '=== 63. a coach cannot choose their own code (expect ERROR) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.users set invite_code = 'NIK-0001' where id = auth.uid();

\echo ''
\echo '=== 64. a stranger resolves a code to a name, and nothing more ==='
reset role;
select invite_code as sam_code from public.users where email = 'sam@settrack.app' \gset
set role authenticated;
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select full_name, client_count from public.lookup_coach(:'sam_code');

\echo ''
\echo '=== 65. lowercase and padding are forgiven (expect Sam Okafor) ==='
select full_name from public.lookup_coach('  ' || lower(:'sam_code') || ' ');

\echo ''
\echo '=== 66. an unknown code is empty, not an error (expect 0 rows) ==='
select count(*) as rows_returned from public.lookup_coach('ZZZ-9999');

\echo ''
\echo '=== 67. a failed lookup still counts against the limit (expect ERROR) ==='
select count(*) from public.lookup_coach('ZZZ-0001');
select count(*) from public.lookup_coach('ZZZ-0002');
select count(*) from public.lookup_coach('ZZZ-0003');
select count(*) from public.lookup_coach('ZZZ-0004');
select count(*) from public.lookup_coach('ZZZ-0005');
select count(*) from public.lookup_coach('ZZZ-0006');
select count(*) from public.lookup_coach('ZZZ-0007');
select full_name from public.lookup_coach(:'sam_code');

\echo ''
\echo '=== 68. nobody reads the lookup ledger (expect ERROR) ==='
select count(*) from public.coach_code_lookups;

\echo ''
\echo '=== 69. attaching grants exactly what was chosen, and nothing else ==='
set request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777"}';
select public.attach_coach('11111111-1111-1111-1111-111111111111',
  p_workouts => true, p_nutrition => true);
reset role;
select status, permissions, log_for, accepted_at is not null as accepted
  from public.coach_clients where client_id = '77777777-7777-7777-7777-777777777777';

\echo ''
\echo '=== 70. one coach at a time (expect ERROR) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777"}';
select public.attach_coach('66666666-6666-6666-6666-666666666666');

\echo ''
\echo '=== 71. detaching ends it and empties it, keeping the history ==='
select public.detach_coach();
reset role;
select status, permissions ->> 'workouts' as workouts, log_for,
       ended_at is not null as ended, accepted_at is not null as history_kept
  from public.coach_clients where client_id = '77777777-7777-7777-7777-777777777777';

\echo ''
\echo '=== 72. and re-attaching is a fresh grant, not the old one back ==='
set role authenticated;
set request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777"}';
select public.attach_coach('11111111-1111-1111-1111-111111111111', p_metrics => true);
reset role;
select status, permissions from public.coach_clients
 where client_id = '77777777-7777-7777-7777-777777777777';

\echo ''
\echo '=== 73. a coach asks for a domain, twice, and has asked once ==='
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.request_access('77777777-7777-7777-7777-777777777777', 'nutrition') as first \gset
select public.request_access('77777777-7777-7777-7777-777777777777', 'nutrition') as second \gset
select :'first' = :'second' as same_request;
reset role;
select domain, answered_at is null as still_open, count(*) as rows
  from public.access_requests
 where client_id = '77777777-7777-7777-7777-777777777777'
 group by domain, answered_at;

\echo ''
\echo '=== 74. asking for something already shared is refused (expect ERROR) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.request_access('77777777-7777-7777-7777-777777777777', 'metrics');

\echo ''
\echo '=== 75. and neither is a client who is not on the roster (expect ERROR) ==='
select public.request_access('44444444-4444-4444-4444-444444444444', 'health');

\echo ''
\echo '=== 76. a request grants nothing on its own (expect nutrition false) ==='
reset role;
select permissions ->> 'nutrition' as nutrition_still_off
  from public.coach_clients where client_id = '77777777-7777-7777-7777-777777777777';

\echo ''
\echo '=== 77. nobody else may answer it (expect ERROR) ==='
select id as req_id from public.access_requests
 where client_id = '77777777-7777-7777-7777-777777777777' and answered_at is null \gset
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.answer_access_request(:'req_id'::uuid, true);

\echo ''
\echo '=== 78. the client says yes, and that is what opens it ==='
set request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777"}';
select public.answer_access_request(:'req_id'::uuid, true);
reset role;
select r.domain, r.granted, r.answered_at is not null as answered,
       cc.permissions ->> 'nutrition' as now_shared
  from public.access_requests r
  join public.coach_clients cc on cc.client_id = r.client_id
 where r.id = :'req_id'::uuid;

\echo ''
\echo '=== 79. answering twice is refused (expect ERROR) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777"}';
select public.answer_access_request(:'req_id'::uuid, false);

\echo ''
\echo '=== 80. withdrawing closes any open ask for the same thing ==='
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.request_access('77777777-7777-7777-7777-777777777777', 'health') is not null as asked;
set request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777"}';
select public.set_coach_permission('health', false);
reset role;
select domain, granted, answered_at is not null as closed
  from public.access_requests
 where client_id = '77777777-7777-7777-7777-777777777777' and domain = 'health';

\echo ''
\echo '=== 81. a detached coach stops seeing the routines they assigned ==='
reset role;
reset request.jwt.claims;
set role authenticated;
-- Maya holds copies from Sam, and their link is still active.
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select count(*) as mine_before from public.routine_instances \gset
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select count(*) as coach_sees_while_attached from public.routine_instances
 where client_id = '22222222-2222-2222-2222-222222222222';
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.detach_coach();
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select count(*) as coach_sees_after_detach from public.routine_instances
 where client_id = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '=== 82. and cannot rewrite them either (expect 0 rows) ==='
update public.routine_instances set name = 'Renamed by an ex-coach'
 where client_id = '22222222-2222-2222-2222-222222222222'
 returning name;

\echo ''
\echo '=== 83. the client keeps every copy — detaching takes nothing ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select count(*) = :mine_before as nothing_lost from public.routine_instances;

\echo ''
\echo '=== 84. a coach saves the profile clients see before attaching ==='
reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
insert into public.coach_profiles (coach_id, gym, bio, specialties)
values (auth.uid(), 'Ironworks Lagos', 'Barbell strength, six days a week.',
        array['Strength', 'Hypertrophy']);
select gym, specialties from public.coach_profiles where coach_id = auth.uid();

\echo ''
\echo '=== 85. the lookup now says who they are, not just that they exist ==='
reset role;
select invite_code as sam_code from public.users where email = 'sam@settrack.app' \gset
set role authenticated;
set request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';
select full_name, gym, specialties, client_count from public.lookup_coach(:'sam_code');

\echo ''
\echo '=== 86. a coach with no profile row still resolves (expect 1 row) ==='
reset role;
select invite_code as late_code from public.users where email = 'late@example.com' \gset
set role authenticated;
set request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';
select full_name, gym = '' as no_gym, cardinality(specialties) as no_specialties
  from public.lookup_coach(:'late_code');

\echo ''
\echo '=== 87. a coach cannot write another coach''s profile (expect ERROR) ==='
insert into public.coach_profiles (coach_id, gym)
values ('11111111-1111-1111-1111-111111111111', 'Hijacked');

\echo ''
\echo '=== 88. a client''s goals are theirs, and their coach''s only with workouts ==='
set request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777"}';
insert into public.client_profiles (client_id, goals, experience, sessions_per_week)
values (auth.uid(), array['Strength', 'Mobility'], '3+ yrs', 5);
select goals, sessions_per_week from public.client_profiles where client_id = auth.uid();
-- Their coach holds workouts (check 69 granted it, check 72 re-granted metrics
-- only), so turn it back on and look from the coach's seat.
select public.set_coach_permission('workouts', true);
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select count(*) as coach_can_read from public.client_profiles
 where client_id = '77777777-7777-7777-7777-777777777777';

\echo ''
\echo '=== 89. and invisible to a coach without it (expect 0) ==='
set request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777"}';
select public.set_coach_permission('workouts', false);
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select count(*) as coach_can_read from public.client_profiles
 where client_id = '77777777-7777-7777-7777-777777777777';

\echo ''
\echo '=== 90. the weekly target is the client''s own answer, not a constant ==='
set request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777"}';
select target as should_be_5 from public.weekly_progress(auth.uid());

\echo ''
\echo '=== 91. but a coach''s program still wins over it (expect 4) ==='
reset role;
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.assign_program(
  (select id from public.programs where name = 'Hypertrophy block'),
  array['77777777-7777-7777-7777-777777777777']::uuid[]) as assigned;
set request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777"}';
select target as should_be_4 from public.weekly_progress(auth.uid());

\echo ''
\echo '=== 92. a label is the coach''s filing, and files a client ==='
reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
insert into public.roster_labels (coach_id, name, color)
values (auth.uid(), 'Prep', 'label-amber') returning id as label_id \gset
update public.coach_clients set label_id = :'label_id'::uuid
 where coach_id = auth.uid() and client_id = '77777777-7777-7777-7777-777777777777';
select l.name, l.color, count(cc.client_id) as filed
  from public.roster_labels l
  left join public.coach_clients cc on cc.label_id = l.id
 where l.coach_id = auth.uid() group by l.name, l.color;

\echo ''
\echo '=== 93. the client cannot see it, let alone move it (expect 0, then ERROR) ==='
set request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777"}';
select count(*) as labels_visible_to_client from public.roster_labels;
update public.coach_clients set label_id = null where client_id = auth.uid();

\echo ''
\echo '=== 94. the roster reads as one row per active client ==='
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select full_name, program_name, label_id is not null as filed,
       permissions ->> 'workouts' as shares_workouts
  from public.roster_clients where coach_id = auth.uid() order by full_name;

\echo ''
\echo '=== 95. training activity follows the workouts permission, not the link ==='
-- 7777 shares nothing right now (check 89 turned workouts back off), so the
-- coach sees the client but none of their sessions.
select full_name, last_workout_at is null as no_session_visible, is_training
  from public.roster_clients
 where coach_id = auth.uid() and client_id = '77777777-7777-7777-7777-777777777777';
set request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777"}';
select public.set_coach_permission('workouts', true);
select public.start_workout() is not null as started;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select full_name, is_training as now_visible
  from public.roster_clients
 where coach_id = auth.uid() and client_id = '77777777-7777-7777-7777-777777777777';

\echo ''
\echo '=== 96. a stranger has no roster (expect 0) ==='
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select count(*) as rows_visible from public.roster_clients;

\echo ''
\echo '=== 97. stats count finished sessions, the week streak and PRs ==='
reset role;
reset request.jwt.claims;
-- Three finished weeks running for Maya, plus one PR, so the numbers are
-- something other than zero and one.
delete from public.workout_sessions where client_id = '22222222-2222-2222-2222-222222222222';
insert into public.workout_sessions (client_id, title, started_at, finished_at)
select '22222222-2222-2222-2222-222222222222', 'W' || n,
       date_trunc('week', now()) - (n * interval '1 week') + interval '2 days',
       date_trunc('week', now()) - (n * interval '1 week') + interval '2 days'
  from generate_series(0, 2) as n;
insert into public.workout_exercises (workout_session_id, name)
select id, 'Bench' from public.workout_sessions
 where client_id = '22222222-2222-2222-2222-222222222222' limit 1;
insert into public.workout_sets (workout_exercise_id, n, reps, is_pr)
select id, 1, 5, true from public.workout_exercises order by created_at desc limit 1;
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select * from public.client_stats(auth.uid());

\echo ''
\echo '=== 98. a gap breaks the streak but not the total (expect streak 1) ==='
reset role;
delete from public.workout_sessions
 where client_id = '22222222-2222-2222-2222-222222222222'
   and finished_at < date_trunc('week', now()) - interval '3 days'
   and finished_at > date_trunc('week', now()) - interval '10 days';
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select sessions, week_streak from public.client_stats(auth.uid());

\echo ''
\echo '=== 99. weekly history returns every week, empty ones included (expect 8) ==='
select count(*) as weeks, sum(done) as total_done, min(target) as target
  from public.client_weekly_history(auth.uid(), 8);

\echo ''
\echo '=== 100. and nobody reads another client''s history (expect 0 rows) ==='
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select count(*) as rows_returned
  from public.client_weekly_history('22222222-2222-2222-2222-222222222222', 8);
select count(*) as stat_rows
  from public.client_stats('22222222-2222-2222-2222-222222222222');

\echo ''

\echo ''
\echo '=== 101. a personal record is the best completed set on each lift ==='
reset role;
reset request.jwt.claims;
delete from public.workout_sessions where client_id = '22222222-2222-2222-2222-222222222222';
insert into public.workout_sessions (client_id, title, started_at, finished_at)
values ('22222222-2222-2222-2222-222222222222', 'Heavy day',
        now() - interval '2 days', now() - interval '2 days')
returning id as heavy_id \gset
insert into public.workout_exercises (id, workout_session_id, name)
values ('aaaaaaaa-1111-1111-1111-111111111111', :'heavy_id'::uuid, 'Bench press'),
       ('aaaaaaaa-2222-2222-2222-222222222222', :'heavy_id'::uuid, 'Squat');
insert into public.workout_sets (workout_exercise_id, n, weight_kg, reps, completed) values
  -- Heaviest wins, and reps break the tie at the same load.
  ('aaaaaaaa-1111-1111-1111-111111111111', 1, 90, 5, true),
  ('aaaaaaaa-1111-1111-1111-111111111111', 2, 92.5, 3, true),
  ('aaaaaaaa-1111-1111-1111-111111111111', 3, 92.5, 5, true),
  -- Never done, so never a record.
  ('aaaaaaaa-1111-1111-1111-111111111111', 4, 120, 1, false),
  ('aaaaaaaa-2222-2222-2222-222222222222', 1, 140, 3, true);
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select name, weight_kg, reps from public.personal_records(auth.uid()) order by name;

\echo ''
\echo '=== 102. volume is load times reps, completed only (expect 1610) ==='
select sum(volume_kg) as total from public.volume_history(auth.uid(), 8);
select count(*) as weeks from public.volume_history(auth.uid(), 8);

\echo ''
\echo '=== 103. PRs count lifts, not events (expect 2) ==='
select personal_records from public.client_stats(auth.uid());

\echo ''
\echo '=== 104. a measurement needs at least one number (expect ERROR) ==='
insert into public.body_measurements (client_id, logged_by) values (auth.uid(), auth.uid());

\echo ''
\echo '=== 105. weight alone is a valid entry; a check-in fills the rest ==='
insert into public.body_measurements (client_id, weight_kg, logged_by)
values (auth.uid(), 82.4, auth.uid());
insert into public.body_measurements (client_id, weight_kg, waist_cm, chest_cm, note, logged_by)
values (auth.uid(), 83.1, 78, 104, 'Waist down, weight flat.', auth.uid());
select weight_kg, waist_cm, note is not null as has_note
  from public.body_measurements where client_id = auth.uid() order by weight_kg;

\echo ''
\echo '=== 106. measurements follow the metrics permission, not workouts ==='
-- Check 81 detached Maya, so re-attach before asking what her coach can see.
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.attach_coach('11111111-1111-1111-1111-111111111111',
  p_workouts => true, p_metrics => false);
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select count(*) as with_workouts_only from public.body_measurements
 where client_id = '22222222-2222-2222-2222-222222222222';
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.set_coach_permission('metrics', true);
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select count(*) as with_metrics from public.body_measurements
 where client_id = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '=== 107. seeing is not writing — needs log_for as well (expect ERROR) ==='
insert into public.body_measurements (client_id, weight_kg, logged_by)
values ('22222222-2222-2222-2222-222222222222', 70, auth.uid());

\echo ''
\echo '=== 108. with log_for the coach may write, and it says who did ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
update public.coach_clients set log_for = true where client_id = auth.uid();
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
insert into public.body_measurements (client_id, weight_kg, logged_by)
values ('22222222-2222-2222-2222-222222222222', 81.9, auth.uid());
reset role;
select weight_kg, (logged_by = client_id) as logged_by_client
  from public.body_measurements
 where client_id = '22222222-2222-2222-2222-222222222222' order by weight_kg;

\echo ''
\echo '=== 109. a coach on the floor sees who is training, and whether they may help ==='
reset role;
reset request.jwt.claims;
set role authenticated;
-- Maya is attached to Sam with log_for on (check 108). Give her an open workout.
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.start_workout() as live_id \gset
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select full_name, log_for, completed_set_count from public.coach_live_sessions
 where coach_id = auth.uid();

\echo ''
\echo '=== 110. a coach may change the load on a set still to come ==='
reset role;
insert into public.workout_exercises (id, workout_session_id, name)
values ('bbbbbbbb-1111-1111-1111-111111111111', :'live_id'::uuid, 'Back squat');
insert into public.workout_sets (workout_exercise_id, n, weight_kg, reps, completed) values
  ('bbbbbbbb-1111-1111-1111-111111111111', 1, 100, 3, true),
  ('bbbbbbbb-1111-1111-1111-111111111111', 2, 100, 3, false);
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.workout_sets set weight_kg = 90
 where workout_exercise_id = 'bbbbbbbb-1111-1111-1111-111111111111' and n = 2;
reset role;
select n, weight_kg, completed, updated_by is not null as changed_by_coach
  from public.workout_sets
 where workout_exercise_id = 'bbbbbbbb-1111-1111-1111-111111111111' order by n;

\echo ''
\echo '=== 111. but not one already done (expect ERROR) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.workout_sets set weight_kg = 60
 where workout_exercise_id = 'bbbbbbbb-1111-1111-1111-111111111111' and n = 1
 returning n;

\echo ''
\echo '=== 112. and may not tick one off for them (expect ERROR) ==='
update public.workout_sets set completed = true
 where workout_exercise_id = 'bbbbbbbb-1111-1111-1111-111111111111' and n = 2;

\echo ''
\echo '=== 113. the client''s own edit is not signed by anyone ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
update public.workout_sets set weight_kg = 95, completed = true
 where workout_exercise_id = 'bbbbbbbb-1111-1111-1111-111111111111' and n = 2;
reset role;
select n, weight_kg, completed, updated_by is null as by_the_client
  from public.workout_sets
 where workout_exercise_id = 'bbbbbbbb-1111-1111-1111-111111111111' and n = 2;

\echo ''
\echo '=== 114. without log_for a coach changes nothing (expect ERROR) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
update public.coach_clients set log_for = false where client_id = auth.uid();
insert into public.workout_sets (workout_exercise_id, n, weight_kg, reps, completed)
values ('bbbbbbbb-1111-1111-1111-111111111111', 3, 100, 3, false);
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.workout_sets set weight_kg = 80
 where workout_exercise_id = 'bbbbbbbb-1111-1111-1111-111111111111' and n = 3
 returning n;

\echo ''
\echo '=== 115. and a finished workout is nobody''s to edit (expect ERROR) ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
update public.coach_clients set log_for = true where client_id = auth.uid();
update public.workout_sessions set finished_at = now() where id = :'live_id'::uuid;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.workout_sets set weight_kg = 70
 where workout_exercise_id = 'bbbbbbbb-1111-1111-1111-111111111111' and n = 3
 returning n;
select count(*) as still_live from public.coach_live_sessions where coach_id = auth.uid();

\echo ''
\echo '=== 116. a coach cannot delete a client''s sets or exercises (expect 0, 0) ==='
-- The hole this migration closed: these policies were `for all` with a USING
-- that only asked whether the parent was visible, and WITH CHECK does not
-- apply to DELETE. Seeing a row was enough to destroy it.
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
delete from public.workout_sets
 where workout_exercise_id = 'bbbbbbbb-1111-1111-1111-111111111111' returning n;
delete from public.workout_exercises
 where id = 'bbbbbbbb-1111-1111-1111-111111111111' returning name;

\echo ''
\echo '=== 117. nor the blocks of a routine they assigned to someone (expect 0) ==='
delete from public.routine_blocks b
 using public.routine_instances i
 where b.routine_instance_id = i.id
   and i.client_id = '22222222-2222-2222-2222-222222222222'
   and i.coach_id is null
 returning b.name;

\echo ''
\echo '=== 118. and the client still has every one of them ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select count(*) as sets_intact from public.workout_sets
 where workout_exercise_id = 'bbbbbbbb-1111-1111-1111-111111111111';

\echo ''
\echo '=== 119. a coach rewrites a copy they assigned, and it reads as diverged ==='
reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select id as assigned_id from public.routine_instances
 where coach_id = auth.uid() and program_routine_id is not null limit 1 \gset
select public.save_client_routine(
  :'assigned_id'::uuid,
  'Push · lighter this week',
  '[{"name":"Bench","scheme":"4 × 6","rpe":"RPE 7","target_kg":70,"note":null,"order_index":0}]'::jsonb,
  'Back off the load while the shoulder settles.'
) is not null as saved;
reset role;
select i.name, i.diverged, i.note is not null as has_note, count(b.id) as blocks
  from public.routine_instances i
  left join public.routine_blocks b on b.routine_instance_id = i.id
 where i.id = :'assigned_id'::uuid
 group by i.name, i.diverged, i.note;

\echo ''
\echo '=== 120. but not one the client built for themselves (expect ERROR) ==='
set role authenticated;
set request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777"}';
select public.save_routine('My own thing',
  '[{"name":"Curl","scheme":"3 × 12","rpe":"","target_kg":10,"note":null,"order_index":0}]'::jsonb
) as own_id \gset
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.save_client_routine(:'own_id'::uuid, 'Hijacked', '[]'::jsonb);

\echo ''
\echo '=== 121. nor another coach''s client (expect ERROR) ==='
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select public.save_client_routine(:'assigned_id'::uuid, 'Not mine', '[]'::jsonb);

\echo ''
\echo '=== 122. and the client still sees their own routine untouched ==='
set request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777"}';
select name, diverged from public.routine_instances where id = :'own_id'::uuid;

\echo ''
\echo '=== 123. a client writes their own health profile ==='
reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
insert into public.health_entries (client_id, section, label, value, status, order_index) values
  (auth.uid(), 'injuries', 'Left shoulder', 'Impingement, cleared Feb 2026', 'Active', 0),
  (auth.uid(), 'conditions', 'Asthma', 'Exercise-induced, inhaler pre-session', null, 0),
  (auth.uid(), 'medication', 'Salbutamol', 'As needed', null, 0);
select section, label, status from public.health_entries
 where client_id = auth.uid() order by section, label;

\echo ''
\echo '=== 124. a status belongs to an injury and nothing else (expect ERROR) ==='
insert into public.health_entries (client_id, section, label, status)
values (auth.uid(), 'conditions', 'Asthma', 'Active');

\echo ''
\echo '=== 125. and it has to be one of the three words (expect ERROR) ==='
insert into public.health_entries (client_id, section, label, status)
values (auth.uid(), 'injuries', 'Knee', 'Probably fine');

\echo ''
\echo '=== 126. a coach with workouts still sees none of it (expect 0) ==='
-- Maya shares workouts and metrics with Sam right now, but not health.
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select count(*) as visible_without_health from public.health_entries
 where client_id = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '=== 127. the client turns health on, and now they do (expect 3) ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.set_coach_permission('health', true);
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select count(*) as visible_with_health from public.health_entries
 where client_id = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '=== 128. reading is not writing — even with health on (expect ERROR) ==='
insert into public.health_entries (client_id, section, label, value)
values ('22222222-2222-2222-2222-222222222222', 'conditions', 'Added by coach', 'x');

\echo ''
\echo '=== 129. and turning it off hides it again without deleting (expect 0, 3) ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.set_coach_permission('health', false);
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select count(*) as coach_sees from public.health_entries
 where client_id = '22222222-2222-2222-2222-222222222222';
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select count(*) as client_still_has from public.health_entries where client_id = auth.uid();

\echo ''
\echo '=== 130. one card per month — the latest reading in it ==='
reset role;
reset request.jwt.claims;
delete from public.body_measurements where client_id = '22222222-2222-2222-2222-222222222222';
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
-- Two readings in this month; the later one is the month's check-in.
select public.save_check_in(auth.uid(), null, 83.1) is not null as first_weigh_in;
select public.save_check_in(auth.uid(), null, 82.4, 78, 104, 96, 16.8,
  'Waist down again with weight flat.') is not null as full_check_in;
reset role;
update public.body_measurements set measured_at = now() - interval '10 days'
 where weight_kg = 83.1;
set role authenticated;
select count(*) as months, max(weight_kg) as shown, min(note) is not null as has_note
  from public.monthly_check_ins(auth.uid(), 12);

\echo ''
\echo '=== 131. an empty check-in is not a check-in (expect ERROR) ==='
select public.save_check_in(auth.uid());

\echo ''
\echo '=== 132. the client edits their own, and it stays theirs ==='
select id as chk_id from public.monthly_check_ins(auth.uid(), 12) limit 1 \gset
select public.save_check_in(auth.uid(), :'chk_id'::uuid, 82.0, 77, 104, 96, 16.5,
  'Corrected the waist.') is not null as edited;
select weight_kg, note, logged_by_client from public.monthly_check_ins(auth.uid(), 12) limit 1;

\echo ''
\echo '=== 133. a coach sees them only with monthly or metrics (expect 0 then 1) ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.set_coach_permission('metrics', false);
select public.set_coach_permission('monthly', false);
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select count(*) as with_neither
  from public.monthly_check_ins('22222222-2222-2222-2222-222222222222', 12);
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.set_coach_permission('monthly', true);
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select count(*) as with_monthly
  from public.monthly_check_ins('22222222-2222-2222-2222-222222222222', 12);

\echo ''
\echo '=== 134. seeing is not logging — that needs log_for (expect ERROR) ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
update public.coach_clients set log_for = false where client_id = auth.uid();
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.save_check_in('22222222-2222-2222-2222-222222222222', null, 80);

\echo ''
\echo '=== 135. with log_for they may, and the row says it was them ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
update public.coach_clients set log_for = true where client_id = auth.uid();
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.save_check_in('22222222-2222-2222-2222-222222222222', :'chk_id'::uuid,
  81.5, 77, 104, 96, 16.4, 'Logged for her after the session.') is not null as coach_saved;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select weight_kg, logged_by_client from public.monthly_check_ins(auth.uid(), 12) limit 1;

\echo ''
\echo '=== 136. an impossible measurement names itself (expect a readable ERROR) ==='
reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
-- 10 cm is what a person typing test values enters. The constraint caught it
-- and said "violates check constraint body_measurements_sane", on a form with
-- five boxes, without saying which.
select public.save_check_in(auth.uid(), null, 85, 10, 10, 10, 10);

\echo ''
\echo '=== 137. and so does each of the others (expect four ERRORs) ==='
select public.save_check_in(auth.uid(), null, 5);
select public.save_check_in(auth.uid(), null, 85, 78, 400);
select public.save_check_in(auth.uid(), null, 85, 78, 104, 1);
select public.save_check_in(auth.uid(), null, 85, 78, 104, 96, 99);

\echo ''
\echo '=== 138. a real one still saves ==='
select public.save_check_in(auth.uid(), null, 85, 78, 104, 96, 16.8, 'Testing things out')
  is not null as saved;

\echo ''
\echo '=== 139. finishing a workout tells the coach, once ==='
reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
-- Maya has shared workouts with Sam by this point in the script.
insert into public.workout_sessions (client_id, title, started_at)
  values (auth.uid(), 'Upper A', now() - interval '50 minutes');
update public.workout_sessions set finished_at = now()
  where client_id = auth.uid() and title = 'Upper A';
-- A rename afterwards is not news, so the count must not move.
update public.workout_sessions set title = 'Upper A · push'
  where client_id = auth.uid() and title = 'Upper A';
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
-- Filtered to this workout, because earlier checks in this file finish others.
-- One row, not two: the rename after finishing must not have written a second.
select count(*) as rows_for_this_workout
  from public.notifications
 where kind = 'session-done'
   and recipient_id = auth.uid()
   and payload ->> 'title' = 'Upper A';

\echo ''
\echo '=== 140. and the feed composes it into words and a destination ==='
select title, body, destination ->> 'route' as route, unread, group_title
  from public.notifications_feed(50)
 where kind = 'session-done';

\echo ''
\echo '=== 141. a stranger sees none of Maya''s (0 expected; their own rows do not count) ==='
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select count(*) as strangers_view_of_maya
  from public.notifications
 where actor_id = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '=== 142. nobody may write a notification (expect ERROR) ==='
set request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
insert into public.notifications (recipient_id, actor_id, kind)
  values ('11111111-1111-1111-1111-111111111111',
          '33333333-3333-3333-3333-333333333333', 'message');

\echo ''
\echo '=== 143. nor rewrite one addressed to them (expect ERROR) ==='
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.notifications set kind = 'detached'
 where recipient_id = auth.uid();

\echo ''
\echo '=== 144. but may mark it read, twice, without complaint ==='
select public.mark_notification_read(id) from public.notifications
 where recipient_id = auth.uid() and kind = 'session-done';
select public.mark_notification_read(id) from public.notifications
 where recipient_id = auth.uid() and kind = 'session-done';
select public.unread_notification_count() as unread_after;

\echo ''
\echo '=== 145. a coach who cannot see measurements is not told they were taken ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.set_coach_permission('monthly', false);
select public.set_coach_permission('metrics', false);
select public.save_check_in(auth.uid(), null, 84.2) is not null as logged;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
-- Identified by its weight rather than counted, because earlier checks in this
-- file logged others. 0: the feed must not become a side channel around the
-- permission that hides the measurement itself.
select count(*) as told_about_the_hidden_one
  from public.notifications
 where recipient_id = auth.uid()
   and kind = 'check-in'
   and payload ->> 'weight_kg' = '84.20';

\echo ''
\echo '=== 146. share it again and the next one does arrive ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.set_coach_permission('monthly', true);
select public.save_check_in(auth.uid(), null, 84.0) is not null as logged;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select count(*) as told_about_the_shared_one
  from public.notifications
 where recipient_id = auth.uid()
   and kind = 'check-in'
   and payload ->> 'weight_kg' = '84.00';

\echo ''
\echo '=== 147. asking for access tells the client, answering tells the coach ==='
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.request_access('22222222-2222-2222-2222-222222222222', 'health') is not null as asked;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select count(*) as client_told
  from public.notifications
 where recipient_id = auth.uid() and kind = 'access-requested';
select title, destination ->> 'route' as route
  from public.notifications_feed(50) where kind = 'access-requested';

\echo ''
\echo '=== 148. every destination the feed can produce is one the app accepts ==='
-- src/lib/notifications.ts refuses anything that is not a single-slash path or
-- an https URL. A row the app will not open is a row that looks tappable and
-- is not.
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select bool_and(
         destination is null
         or (destination ->> 'kind' = 'screen'
             and destination ->> 'route' ~ '^/[^/]')
         or (destination ->> 'kind' in ('web', 'external')
             and destination ->> 'url' like 'https://%')
       ) as every_destination_openable
  from public.notifications_feed(200);

\echo ''
\echo '=== 149. hiding something from the Health screen tells the coach ==='
reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.set_coach_permission('health', true);
select public.set_coach_permission('health', false);
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
-- This is the bug the migration exists for: the switch wrote coach_clients
-- directly, and the feed only listened to access_requests.
select kind, payload ->> 'domain' as domain
  from public.notifications
 where recipient_id = auth.uid() and payload ->> 'domain' = 'health'
 order by created_at desc limit 2;

\echo ''
\echo '=== 150. and says it once, not twice, when a request was open ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.set_coach_permission('nutrition', false);
-- Counted from a mark rather than over the whole table: earlier checks in this
-- file have granted nutrition too, and a running total proves nothing.
select now() as t0 \gset
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.request_access('22222222-2222-2222-2222-222222222222', 'nutrition') is not null as asked;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
-- Answering "yes" writes access_requests AND coach_clients. One notification.
select public.set_coach_permission('nutrition', true);
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select count(*) as granted_rows_from_this_answer
  from public.notifications
 where recipient_id = auth.uid()
   and kind = 'access-granted' and payload ->> 'domain' = 'nutrition'
   and created_at > :'t0';

\echo ''
\echo '=== 151. declining is not revoking ==='
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.request_access('22222222-2222-2222-2222-222222222222', 'metrics') as req_id \gset
select now() as t2 \gset
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.answer_access_request(:'req_id', false);
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
-- Nothing was taken away, because nothing had been given. "Maya hid her
-- measurements" would send a coach looking for something never there.
select kind, payload ->> 'domain' as domain
  from public.notifications
 where recipient_id = auth.uid() and created_at > :'t2';

\echo ''
\echo '=== 152. detaching says "detached", not five revocations ==='
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.set_coach_permission('workouts', true);
select now() as t1 \gset
select public.detach_coach();
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
-- Clearing all five on the way out would bury the one fact that matters.
select
  count(*) filter (where kind = 'access-revoked') as revokes,
  count(*) filter (where kind = 'detached') as detaches
  from public.notifications
 where recipient_id = auth.uid() and created_at > :'t1';

\echo ''
\echo '=== 153. log_for is the sixth permission and now moves like one ==='
reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
-- 152 detached, so re-attach for this one.
select public.attach_coach('11111111-1111-1111-1111-111111111111') is not null as reattached;
select now() as t3 \gset
select public.set_log_for(true);
select public.set_log_for(false);
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select kind, payload ->> 'domain' as domain
  from public.notifications
 where recipient_id = auth.uid() and created_at > :'t3'
 order by created_at;

\echo ''
\echo '=== 154. and it reads as a sentence, not a column name ==='
-- "Maya shared their logging for them" is what a generic label produces.
select f.kind, f.title
  from public.notifications_feed(200) f
  join public.notifications n on n.id = f.id
 where n.payload ->> 'domain' = 'log_for'
 order by f.kind;

\echo ''
\echo '=== 155. only the client may set it (expect ERROR) ==='
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
update public.coach_clients set log_for = true
 where client_id = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '=== 156. a client cannot forge an imported exercise (expect ERROR) ==='
reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
-- A catalogue entry nobody can trace is worse than one that is missing.
insert into public.exercises (owner_id, name, source, external_id)
  values (auth.uid(), 'Fake press', 'workoutx', 'forged-1');

\echo ''
\echo '=== 157. they can still invent their own ==='
insert into public.exercises (owner_id, name) values (auth.uid(), 'Deficit split squat');
select name, source, tag from public.exercises where owner_id = auth.uid();

\echo ''
\echo '=== 158. an imported row composes its own picker fields ==='
reset role;
insert into public.exercises (name, source, external_id, equipment, body_part, mechanic)
  values ('Barbell bench press', 'workoutx', 'wx-1', 'barbell', 'chest', 'compound');
select name, meta, tag, muscle_group from public.exercises where external_id = 'wx-1';

\echo ''
\echo '=== 159. re-importing the same exercise updates rather than duplicates ==='
insert into public.exercises (name, source, external_id, equipment, body_part, mechanic)
  values ('Barbell bench press', 'workoutx', 'wx-1', 'dumbbell', 'chest', 'isolation')
  on conflict (source, external_id) do update
    set equipment = excluded.equipment,
        mechanic = excluded.mechanic,
        synced_at = now();
select count(*) as rows_for_wx1, max(meta) as meta, max(tag) as tag
  from public.exercises where external_id = 'wx-1';

\echo ''
\echo '=== 160. and a client cannot edit it — RLS filters it, so no error, no change ==='
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
update public.exercises set name = 'Mine now' where external_id = 'wx-1';
-- Silent rather than refused: `exercises_write_own` scopes to owner_id, and an
-- imported row has none, so the statement matches nothing. The name below is
-- the assertion.
select name from public.exercises where external_id = 'wx-1';

\echo ''
\echo '=== 161. but they can read it, because the library is shared ==='
select name, meta from public.exercises where external_id = 'wx-1';

\echo ''
\echo '=== 162. a block remembers which catalogue entry it came from ==='
reset role;
reset request.jwt.claims;
-- The catalogue row from check 158.
insert into public.routine_instances (client_id, name)
  values ('22222222-2222-2222-2222-222222222222', 'Preview test')
  returning id \gset inst_
insert into public.routine_blocks (routine_instance_id, name, exercise_id)
  select :'inst_id', 'Barbell bench press', e.id
    from public.exercises e where e.external_id = 'wx-1';
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select p.name, p.equipment
  from public.routine_blocks b
  cross join lateral public.exercise_preview(b.exercise_id, b.name) p
 where b.routine_instance_id = :'inst_id';

\echo ''
\echo '=== 163. a renamed copy keeps its preview, which the name alone would lose ==='
reset role;
update public.routine_blocks set name = 'Bench press (paused)'
 where routine_instance_id = :'inst_id';
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select b.name as block_name, p.name as catalogue_name
  from public.routine_blocks b
  cross join lateral public.exercise_preview(b.exercise_id, b.name) p
 where b.routine_instance_id = :'inst_id';

\echo ''
\echo '=== 164. something invented has no preview, and says so by returning nothing ==='
select count(*) as rows_for_an_invented_lift
  from public.exercise_preview(null, 'Nordic curl on a bosu');

\echo ''
\echo '=== 165. deactivating ends every relationship, in both directions ==='
reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.attach_coach('11111111-1111-1111-1111-111111111111') is not null as attached;
select public.deactivate_account();
reset role;
select status, permissions ->> 'workouts' as workouts, log_for
  from public.coach_clients where client_id = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '=== 166. and touches no training data — the whole point of the word ==='
select
  (select count(*) from public.workout_sessions
    where client_id = '22222222-2222-2222-2222-222222222222') as workouts,
  (select count(*) from public.body_measurements
    where client_id = '22222222-2222-2222-2222-222222222222') as check_ins,
  (select deactivated_at is not null
     from public.users where id = '22222222-2222-2222-2222-222222222222') as dormant;

\echo ''
\echo '=== 167. signing back in wakes it, and says so once ==='
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.reactivate_account() as woke_it;
-- Second call returns false: there is nothing left to wake, so the app does
-- not greet somebody with "welcome back" on every launch.
select public.reactivate_account() as woke_it_again;

\echo ''
\echo '=== 168. the coach link does not come back with them ==='
reset role;
select status from public.coach_clients
 where client_id = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '=== 169. a block records which catalogue entry it came from ==='
reset role;
reset request.jwt.claims;
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select e.id as wx_id from public.exercises e where e.external_id = 'wx-1' \gset
select public.save_routine('Measured routine', jsonb_build_array(
  jsonb_build_object('name', 'Barbell bench press', 'scheme', '3 × 10',
                     'order_index', 0, 'exercise_id', :'wx_id', 'target_kg', 80),
  jsonb_build_object('name', 'Treadmill', 'scheme', '5 km', 'order_index', 1,
                     'target_distance_km', 5, 'target_duration_seconds', 1800),
  jsonb_build_object('name', 'Plank', 'scheme', '3 × 45s', 'order_index', 2,
                     'target_duration_seconds', 45)
)) as routine \gset
select name, scheme, target_kg, target_distance_km, target_duration_seconds,
       exercise_id is not null as linked
  from public.routine_blocks where routine_instance_id = :'routine'
 order by order_index;

\echo ''
\echo '=== 170. a zero target is the stepper floor, not a prescription ==='
select public.save_routine('Measured routine', jsonb_build_array(
  jsonb_build_object('name', 'Treadmill', 'scheme', '5 km', 'order_index', 0,
                     'target_distance_km', 0, 'target_duration_seconds', 0)
), null, :'routine') is not null as saved;
select target_distance_km, target_duration_seconds
  from public.routine_blocks where routine_instance_id = :'routine';

\echo ''
\echo '=== 171. the measure comes from the catalogue, or from what was prescribed ==='
reset role;
reset request.jwt.claims;
-- A cardio catalogue entry. The seed has none, and `body_part = 'cardio'` is
-- how the import guesses one.
insert into public.exercises (name, source, external_id, body_part, equipment, measure)
values ('Treadmill', 'workoutx', 'wx-run', 'cardio', 'machine', 'distance_duration')
returning id as wx_run \gset
select
  -- Linked: the catalogue answers, whatever the targets happen to be.
  public.measure_for_block(:'wx_run', null, null, null) as from_catalogue,
  -- Typed by hand: the prescription answers for itself.
  public.measure_for_block(null, null, 5, 1800) as a_run,
  public.measure_for_block(null, 30, 0.03, null) as a_carry,
  public.measure_for_block(null, null, null, 45) as a_hold,
  public.measure_for_block(null, null, null, null) as everything_else;

\echo ''
\echo '=== 172. starting a routine seeds each lift in the terms it is counted in ==='
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.save_routine('Mixed day', jsonb_build_array(
  jsonb_build_object('name', 'Bench', 'scheme', '3 × 10', 'order_index', 0,
                     'target_kg', 80),
  jsonb_build_object('name', 'Treadmill', 'scheme', '5 km · 30:00', 'order_index', 1,
                     'exercise_id', :'wx_run',
                     'target_distance_km', 5, 'target_duration_seconds', 1800),
  jsonb_build_object('name', 'Plank', 'scheme', '3 × 45s', 'order_index', 2,
                     'target_duration_seconds', 45)
)) as mixed \gset
select public.start_workout(:'mixed') as mixed_session \gset
select e.name, count(s.id) as sets,
       max(s.weight_kg) as kg, max(s.reps) as reps,
       max(s.distance_km) as km, max(s.duration_seconds) as secs
  from public.workout_exercises e
  left join public.workout_sets s on s.workout_exercise_id = e.id
 where e.workout_session_id = :'mixed_session'
 group by e.name, e.order_index
 order by e.order_index;

\echo ''
\echo '=== 173. and the catalogue link reaches the session, for the preview ==='
select e.name, e.exercise_id is not null as linked
  from public.workout_exercises e
 where e.workout_session_id = :'mixed_session'
 order by e.order_index;

\echo ''
\echo '=== 174. an assigned copy arrives with the distance, not without it ==='
select public.attach_coach('11111111-1111-1111-1111-111111111111');
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.save_program('Conditioning', 1, 1, jsonb_build_array(
  jsonb_build_object('name', 'Cardio', 'order_index', 0, 'blocks', jsonb_build_array(
    jsonb_build_object('name', 'Treadmill', 'scheme', '3 km · 20:00', 'order_index', 0,
                       'exercise_id', :'wx_run',
                       'target_distance_km', 3, 'target_duration_seconds', 1200)
  ))
)) as cardio_program \gset
select public.assign_program(:'cardio_program',
  array['22222222-2222-2222-2222-222222222222']::uuid[]) as assigned;
reset role;
-- Taken here rather than as the client: `program_routines` is the coach's to
-- read, so a client joining through it sees nothing and the \gset comes back
-- empty.
select i.id as cardio_instance
  from public.routine_instances i
  join public.program_routines r on r.id = i.program_routine_id
 where r.program_id = :'cardio_program' limit 1 \gset
select b.name, b.target_distance_km, b.target_duration_seconds,
       b.exercise_id is not null as linked
  from public.routine_blocks b
 where b.routine_instance_id = :'cardio_instance';

\echo ''
\echo '=== 175. moving only the distance is a change, and is proposed as one ==='
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.save_program('Conditioning', 1, 1, jsonb_build_array(
  jsonb_build_object('name', 'Cardio', 'order_index', 0, 'blocks', jsonb_build_array(
    -- The scheme is display text and did not move; only the prescription did.
    jsonb_build_object('name', 'Treadmill', 'scheme', '3 km · 20:00', 'order_index', 0,
                       'exercise_id', :'wx_run',
                       'target_distance_km', 5, 'target_duration_seconds', 1200)
  ))
), null, :'cardio_program') is not null as resaved;
select public.publish_program(:'cardio_program') as asked;
reset role;
select u.summary, b.target_distance_km as proposed_km
  from public.routine_updates u
  join public.routine_update_blocks b on b.routine_update_id = u.id
  join public.routine_instances i on i.id = u.routine_instance_id
  join public.program_routines r on r.id = i.program_routine_id
 where r.program_id = :'cardio_program';

\echo ''
\echo '=== 176. accepting it keeps the distance rather than flattening the copy ==='
set role authenticated;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select public.decide_routine_update(:'cardio_instance', true) as accepted;
reset role;
select b.target_distance_km, b.target_duration_seconds,
       b.exercise_id is not null as still_linked
  from public.routine_blocks b
 where b.routine_instance_id = :'cardio_instance';

\echo ''
\echo '=== 177. a coach editing the copy keeps the prescription they can see ==='
-- The fourth write path. It replaces the blocks like every other save here, so
-- a coach fixing a typo used to blank the distance on the client''s treadmill.
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select public.save_client_routine(:'cardio_instance', 'Conditioning (fixed)',
  jsonb_build_array(
    jsonb_build_object('name', 'Treadmill', 'scheme', '5 km · 20:00', 'order_index', 0,
                       'exercise_id', :'wx_run',
                       'target_distance_km', 5, 'target_duration_seconds', 1200)
  )) is not null as saved;
reset role;
select b.name, b.target_distance_km, b.target_duration_seconds,
       b.exercise_id is not null as still_linked
  from public.routine_blocks b
 where b.routine_instance_id = :'cardio_instance';

\echo ''
\echo '=== 178. the measure guess reads equipment, not just the body part ==='
-- Battling ropes came through as load × reps, and the builder offered a coach
-- a working weight in kilograms for it.
reset role;
reset request.jwt.claims;
select
  public.guess_exercise_measure('Battling Ropes', 'waist', 'rope') as ropes,
  public.guess_exercise_measure('Jump rope', 'cardio', 'rope') as skipping,
  public.guess_exercise_measure('Sled push', 'upper legs', 'sled machine') as sled,
  public.guess_exercise_measure('Stationary bike walk', 'cardio', 'stationary bike')
    as bike,
  public.guess_exercise_measure('Front plank', 'waist', 'body weight') as plank,
  public.guess_exercise_measure('3/4 sit-up', 'waist', 'body weight') as situp,
  public.guess_exercise_measure('Barbell bench press', 'chest', 'barbell') as bench;

\echo ''
\echo '=== 179. and it runs on every import, not once in a migration ==='
-- The sync inserts rows without setting `measure`, so a guess that only ever
-- ran as a one-off UPDATE left everything imported afterwards on the default.
insert into public.exercises (name, source, external_id, body_part, equipment)
values ('Battle Ropes Wave', 'workoutx', 'wx-ropes', 'shoulders', 'rope');
select name, measure from public.exercises where external_id = 'wx-ropes';

\echo ''
\echo '=== 180. an answered measure is not overruled by the guess ==='
-- What makes a coach-facing override possible later: the guess fills in the
-- default and nothing else.
update public.exercises set measure = 'load_reps' where external_id = 'wx-ropes';
select measure as guessed_again from public.exercises where external_id = 'wx-ropes';
update public.exercises set measure = 'load_distance', name = 'Battle Ropes Drag'
 where external_id = 'wx-ropes';
select measure as kept_the_answer from public.exercises where external_id = 'wx-ropes';

\echo ''
\echo '=== 181. distance is claimed only where something measures distance ==='
-- The dataset files burpees and mountain climbers under cardio. Asking a coach
-- for kilometres of burpees is the same bug as offering kilograms of rope.
select
  public.guess_exercise_measure('Burpee', 'cardio', 'body weight') as burpee,
  public.guess_exercise_measure('Mountain climber', 'cardio', 'body weight')
    as climber,
  public.guess_exercise_measure('Jumping jack', 'cardio', 'body weight') as jacks,
  -- A machine that does measure it still says so.
  public.guess_exercise_measure('Treadmill walk', 'cardio', 'treadmill') as treadmill,
  -- And a hold is still a hold, body weight or not.
  public.guess_exercise_measure('Front plank', 'waist', 'body weight') as plank,
  -- A rope on a cable stack is not a battling rope.
  public.guess_exercise_measure('Cable rope overhead triceps extension',
    'upper arms', 'cable') as cable_rope;
