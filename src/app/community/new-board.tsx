import { useCallback } from 'react';

import { useRosterQuery } from '@/api/roster';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import NewBoardContent from '@/screens/new-board/NewBoardContent';
import NewBoardSkeleton from '@/screens/new-board/NewBoardSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
export default function NewBoardScreen() {
  const { data, isPending, error, refetch } = useRosterQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="New leaderboard"
          eyebrow="Community"
          backLabel="Community"
        />
        <NewBoardSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="New leaderboard"
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
        title="New leaderboard"
        eyebrow="Community"
        backLabel="Community"
      />
      <NewBoardContent clients={data.clients} />
    </LISafeArea>
  );
}
