import { useCallback, useState } from 'react';

import { useCoachGroupsQuery } from '@/api/community';
import { useInboxQuery } from '@/api/coachMessages';
import { queryKeys } from '@/api/queryKeys';
import { useLiveMessages } from '@/hooks/useLiveMessages';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import CommunityCreateSheet from '@/screens/messages/CommunityCreateSheet';
import InboxContent from '@/screens/messages/InboxContent';
import InboxSkeleton from '@/screens/messages/InboxSkeleton';
import MessagesNewButton from '@/screens/messages/MessagesNewButton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only. The search term lives here rather than in the list because it
 * *is* the query — the same reasoning as the exercise picker — and the fetch
 * stays at screen level, with rows handed down as props.
 *
 * Two fetches now: the 1:1 threads and the groups this coach runs. They are
 * separate endpoints because they answer different questions, and the group
 * list is deliberately not blocking — an inbox that will not open because a
 * group list is slow is a worse inbox.
 */
export default function MessagesScreen() {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const { data, isPending, error, refetch, isRefetching } = useInboxQuery(query);
  const groups = useCoachGroupsQuery();

  // No filter: every message this coach is allowed to see, which is every
  // thread they are in. The scoping is `messages_select_in_my_threads`, not
  // this call — Postgres Changes runs each event through RLS before it is
  // delivered, so there is nothing here to get wrong.
  useLiveMessages({
    key: 'inbox',
    invalidate: [queryKeys.coachMessages.inboxAll],
  });

  const refresh = useCallback(() => {
    void refetch();
    void groups.refetch();
  }, [groups, refetch]);

  const openCreate = useCallback(() => setCreating(true), []);
  const closeCreate = useCallback(() => setCreating(false), []);

  if (isPending) {
    return (
      <LISafeArea>
        <ScreenHeader title="Messages" eyebrow="Your clients" />
        <InboxSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <ScreenHeader title="Messages" eyebrow="Your clients" />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
          title="Messages"
          eyebrow="Your clients"
          action={<MessagesNewButton onNew={openCreate} />}
        />
      <InboxContent
        entries={data}
        groups={groups.data ?? []}
        query={query}
        onQueryChange={setQuery}
        refreshing={isRefetching}
        onRefresh={refresh}
      />
      <CommunityCreateSheet visible={creating} onClose={closeCreate} />
    </LISafeArea>
  );
}
