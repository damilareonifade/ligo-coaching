import { useCallback } from 'react';

import { useClientChatQuery } from '@/api/clientChat';
import { queryKeys } from '@/api/queryKeys';
import { useLiveMessages } from '@/hooks/useLiveMessages';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import ChatSkeleton from '@/components/chat/ChatSkeleton';
import ChatContent from '@/screens/coach-chat/ChatContent';

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
export default function CoachChatScreen() {
  const { data, isPending, error, refetch } = useClientChatQuery();

  // Nothing to listen to until the thread is known, which is why `enabled`
  // exists rather than the hook guessing from an empty string.
  useLiveMessages({
    key: data?.threadId ?? 'pending',
    filter: data ? `thread_id=eq.${data.threadId}` : undefined,
    enabled: Boolean(data?.threadId),
    invalidate: [queryKeys.clientChat],
  });

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={['top', 'bottom']}>
        <ScreenHeader
          title="Messages"
          eyebrow="Your coach"
          backLabel="Back"
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
          eyebrow="Your coach"
          backLabel="Back"
        />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea edges={['top', 'bottom']}>
      <ScreenHeader
        title="Messages"
        eyebrow="Your coach"
        backLabel="Back"
      />
      <ChatContent chat={data} />
    </LISafeArea>
  );
}
