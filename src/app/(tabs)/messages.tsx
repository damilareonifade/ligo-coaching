import { useCallback, useState } from 'react';

import { useCoachGroupsQuery } from '@/api/community';
import { useInboxQuery } from '@/api/coachMessages';
import { LIErrorState, LISafeArea } from '@/components/ui';
import CommunityCreateSheet from '@/screens/messages/CommunityCreateSheet';
import InboxContent from '@/screens/messages/InboxContent';
import InboxSkeleton from '@/screens/messages/InboxSkeleton';
import MessagesTitle from '@/screens/messages/MessagesTitle';

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

  const refresh = useCallback(() => {
    void refetch();
    void groups.refetch();
  }, [groups, refetch]);

  const openCreate = useCallback(() => setCreating(true), []);
  const closeCreate = useCallback(() => setCreating(false), []);

  if (isPending) {
    return (
      <LISafeArea>
        <MessagesTitle />
        <InboxSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <MessagesTitle />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <MessagesTitle onNew={openCreate} />
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
