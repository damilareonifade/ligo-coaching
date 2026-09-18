-- ---------------------------------------------------------------------------
-- Messages arrive without being asked for.
--
-- A thread that only updates when you pull it down is not a conversation, and
-- polling for one is the same request forty times an hour whether or not
-- anybody spoke. Postgres Changes replaces both: the database is already
-- writing the row, and this is it saying so.
--
-- Postgres Changes rather than Broadcast, deliberately. Broadcast sends each
-- change once and fans it out, which is what Supabase recommends past roughly
-- three thousand subscribers on the same rows — Postgres Changes authorizes
-- per subscriber on a single thread, so its ceiling is subscriber count rather
-- than write rate. A coach has forty clients. The trade the other way is the
-- one that matters here: Postgres Changes runs every event through RLS, so
-- `messages_select_in_my_threads` decides who hears about a message exactly as
-- it decides who can read one. With Broadcast that check would be a second
-- implementation of the same rule, in JavaScript, where nothing tests it.
--
-- INSERT only is all the app subscribes to, which is all there is: messages
-- carry no update or delete grant. That also sidesteps the one documented
-- filtering limit — delete events need `replica identity full` to be
-- filterable — because there are no delete events.
-- ---------------------------------------------------------------------------
do $$
begin
  -- Guarded like the storage bucket, and for the same reason: the throwaway
  -- Postgres the behavioural checks run against is not a Supabase project and
  -- has no `supabase_realtime` publication to add to.
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;
  end if;
end
$$;
