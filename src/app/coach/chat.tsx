import { useCallback } from 'react';

import { useClientChatQuery } from '@/api/clientChat';
import { queryKeys } from '@/api/queryKeys';
import { useLiveMessages } from '@/hooks/useLiveMessages';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import ChatSkeleton from '@/components/chat/ChatSkeleton';
import ChatContent from '@/screens/coach-chat/ChatContent';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
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
      <LISafeArea edges={['bottom']}>
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
      <LISafeArea edges={['bottom']}>
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
    <LISafeArea edges={['bottom']}>
      <ScreenHeader
        title="Messages"
        eyebrow="Your coach"
        backLabel="Back"
      />
      <ChatContent chat={data} />
    </LISafeArea>
  );
}
