import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useBoardQuery } from '@/api/community';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import BoardContent from '@/screens/community-board/BoardContent';
import BoardSkeleton from '@/screens/community-board/BoardSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
export default function CommunityBoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch, isRefetching } = useBoardQuery(id);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Leaderboard"
          eyebrow="Community"
          backLabel="Community"
        />
        <BoardSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Leaderboard"
          eyebrow="Community"
          backLabel="Community"
        />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
        title="Leaderboard"
        eyebrow="Community"
        backLabel="Community"
      />
      <BoardContent board={data} refreshing={isRefetching} onRefresh={refresh} />
    </LISafeArea>
  );
}
