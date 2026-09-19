-- ---------------------------------------------------------------------------
-- The dot has to learn about a notification it was not on screen for.
--
-- `unread_notification_count` was asked once, when Today mounted, and never
-- again: the query carries no `refetchInterval`, nothing subscribes on its
-- behalf, and the app's default `staleTime` is a minute. So a notification
-- written while somebody sat on Today changed nothing they could see. That is
-- how a group invitation could be delivered correctly, sit unread in the
-- table, and still be found only by opening the bell on a hunch.
--
-- The same trade `messages` already made, for the same reasons: Postgres
-- Changes runs every event through RLS, so `notifications_select_own` decides
-- who hears about a row exactly as it decides who may read one. A recipient
-- hears about their own and nobody else's, and that rule lives in one place
-- rather than being restated in JavaScript where nothing tests it.
--
-- INSERT only is what the app subscribes to. Marking one read is an UPDATE the
-- reader made themselves, on the device that already knows.
-- ---------------------------------------------------------------------------
do $$
begin
  -- Guarded like `messages` and the storage bucket: the throwaway Postgres the
  -- behavioural checks run against is not a Supabase project and has no
  -- `supabase_realtime` publication to add to.
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end
$$;
