import { useCallback } from 'react';

import { useClientChatQuery } from '@/api/clientChat';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ChatContent from '@/screens/coach-chat/ChatContent';
import ChatSkeleton from '@/screens/coach-chat/ChatSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so no safe-area edges here. */
export default function CoachChatScreen() {
  const { data, isPending, error, refetch } = useClientChatQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={['bottom']}>
        <ChatSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea edges={['bottom']}>
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea edges={['bottom']}>
      <ChatContent chat={data} />
    </LISafeArea>
  );
}
