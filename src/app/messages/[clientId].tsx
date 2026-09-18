import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useCoachThreadQuery } from '@/api/coachMessages';
import { queryKeys } from '@/api/queryKeys';
import { useLiveMessages } from '@/hooks/useLiveMessages';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import ChatSkeleton from '@/components/chat/ChatSkeleton';
import CoachThreadContent from '@/screens/coach-thread/CoachThreadContent';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so only the bottom edge here. */
export default function CoachThreadScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { data, isPending, error, refetch } = useCoachThreadQuery(clientId ?? '');

  // Both lists: the thread it lands in, and the inbox row above it showing
  // the last thing said. `inboxAll` is the prefix over every search variant.
  useLiveMessages({
    key: data?.threadId ?? 'pending',
    filter: data ? `thread_id=eq.${data.threadId}` : undefined,
    enabled: Boolean(data?.threadId),
    invalidate: [queryKeys.coachMessages.thread(clientId ?? ''), queryKeys.coachMessages.inboxAll],
  });

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={['bottom']}>
        <ScreenHeader
          title="Messages"
          eyebrow="Thread"
          backLabel="Messages"
        />
        <ChatSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea edges={['bottom']}>
        <ScreenHeader
          title="Messages"
          eyebrow="Thread"
          backLabel="Messages"
        />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea edges={['bottom']}>
      <ScreenHeader
        title="Messages"
        eyebrow="Thread"
        backLabel="Messages"
      />
      <CoachThreadContent thread={data} />
    </LISafeArea>
  );
}
