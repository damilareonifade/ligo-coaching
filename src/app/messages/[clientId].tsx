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

/**
 * Composer only.
 *
 * Both edges. These three screens used to take only the bottom one, on the
 * stated belief that "the header owns the top inset" — `ScreenHeader` does
 * not, and never has: it has no `useSafeAreaInsets` in it and opens with
 * `pt-2`. So the eyebrow sat under the status bar. It showed up here rather
 * than anywhere else because every screen with this comment is a messaging or
 * community one, and those were behind a flag until now.
 */
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
      <LISafeArea edges={['top', 'bottom']}>
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
      <LISafeArea edges={['top', 'bottom']}>
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
    <LISafeArea edges={['top', 'bottom']}>
      <ScreenHeader
        title="Messages"
        eyebrow="Thread"
        backLabel="Messages"
      />
      <CoachThreadContent thread={data} />
    </LISafeArea>
  );
}
