import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useBoardQuery } from '@/api/community';
import { LIErrorState, LISafeArea } from '@/components/ui';
import BoardContent from '@/screens/community-board/BoardContent';
import BoardSkeleton from '@/screens/community-board/BoardSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so no safe-area edges here. */
export default function CommunityBoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch, isRefetching } = useBoardQuery(id);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={[]}>
        <BoardSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea edges={[]}>
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea edges={[]}>
      <BoardContent board={data} refreshing={isRefetching} onRefresh={refresh} />
    </LISafeArea>
  );
}
