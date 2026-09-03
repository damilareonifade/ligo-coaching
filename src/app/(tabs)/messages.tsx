import { useCallback, useState } from 'react';

import { useInboxQuery } from '@/api/coachMessages';
import { LIErrorState, LISafeArea } from '@/components/ui';
import InboxContent from '@/screens/messages/InboxContent';
import InboxSkeleton from '@/screens/messages/InboxSkeleton';
import MessagesTitle from '@/screens/messages/MessagesTitle';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only. The search term lives here rather than in the list because it
 * *is* the query — the same reasoning as the exercise picker — and the fetch
 * stays at screen level, with rows handed down as props.
 */
export default function MessagesScreen() {
  const [query, setQuery] = useState('');
  const { data, isPending, error, refetch, isRefetching } = useInboxQuery(query);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

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
      <MessagesTitle />
      <InboxContent
        entries={data}
        query={query}
        onQueryChange={setQuery}
        refreshing={isRefetching}
        onRefresh={refresh}
      />
    </LISafeArea>
  );
}
