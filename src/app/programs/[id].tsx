import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useProgramDetailQuery } from '@/api/coachPrograms';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import ProgramDetailContent from '@/screens/program-detail/ProgramDetailContent';
import ProgramDetailSkeleton from '@/screens/program-detail/ProgramDetailSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch, isRefetching } = useProgramDetailQuery(id ?? '');

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Program"
          eyebrow="Your library"
          backLabel="Programs"
        />
        <ProgramDetailSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Program"
          eyebrow="Your library"
          backLabel="Programs"
        />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
        title="Program"
        eyebrow="Your library"
        backLabel="Programs"
      />
      <ProgramDetailContent program={data} refreshing={isRefetching} onRefresh={refresh} />
    </LISafeArea>
  );
}
