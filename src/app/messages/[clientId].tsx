import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useCoachThreadQuery } from '@/api/coachMessages';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ChatSkeleton from '@/screens/chat/ChatSkeleton';
import CoachThreadContent from '@/screens/coach-thread/CoachThreadContent';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so only the bottom edge here. */
export default function CoachThreadScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { data, isPending, error, refetch } = useCoachThreadQuery(clientId ?? '');

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
      <CoachThreadContent thread={data} />
    </LISafeArea>
  );
}
