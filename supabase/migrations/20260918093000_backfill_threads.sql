-- ---------------------------------------------------------------------------
-- Threads for the pairs that were already attached.
--
-- `coach_clients_sync_thread` opens a thread when a link becomes active, which
-- covers every pair from here on and none of the ones already there. On a
-- project with a live roster that is the whole roster: the trigger fires on
-- insert or update, and an established coach↔client row is neither.
--
-- The symptom would have been the client's chat screen reporting "You do not
-- have a coach attached" to somebody looking at their coach's name on the
-- previous screen. It did not show up in the behavioural checks because those
-- insert their fixtures after the migrations run, so the trigger always fires
-- there — the one shape the harness cannot reproduce is the one that matters
-- here.
--
-- Ended links are skipped deliberately. They have no messages to preserve, so
-- a thread for one would be an empty archive nobody asked for; if they attach
-- again the trigger opens it then.
-- ---------------------------------------------------------------------------
insert into public.threads (kind, coach_id, client_id)
select 'direct', cc.coach_id, cc.client_id
  from public.coach_clients cc
 where cc.status = 'active'
on conflict (coach_id, client_id) where kind = 'direct' do nothing;

-- Both seats, for every direct thread that is short of them. Written from
-- `threads` rather than from `coach_clients` so it also repairs a thread whose
-- members were somehow lost, and so running it twice changes nothing.
insert into public.thread_members (thread_id, user_id)
select t.id, t.coach_id from public.threads t where t.kind = 'direct'
union all
select t.id, t.client_id from public.threads t where t.kind = 'direct'
on conflict (thread_id, user_id) do nothing;
