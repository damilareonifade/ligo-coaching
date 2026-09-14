import { useCallback } from 'react';

import { useClientChatQuery } from '@/api/clientChat';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import ChatSkeleton from '@/components/chat/ChatSkeleton';
import ChatContent from '@/screens/coach-chat/ChatContent';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
export default function CoachChatScreen() {
  const { data, isPending, error, refetch } = useClientChatQuery();

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
