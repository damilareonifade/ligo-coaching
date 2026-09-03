import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useProgramDetailQuery } from '@/api/coachPrograms';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ProgramDetailContent from '@/screens/program-detail/ProgramDetailContent';
import ProgramDetailSkeleton from '@/screens/program-detail/ProgramDetailSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so no safe-area edges here. */
export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch, isRefetching } = useProgramDetailQuery(id ?? '');

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={[]}>
        <ProgramDetailSkeleton />
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
      <ProgramDetailContent program={data} refreshing={isRefetching} onRefresh={refresh} />
    </LISafeArea>
  );
}
