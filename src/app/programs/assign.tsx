import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useProgramDetailQuery } from '@/api/coachPrograms';
import { useRosterQuery } from '@/api/roster';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import AssignContent from '@/screens/program-assign/AssignContent';
import ProgramDetailSkeleton from '@/screens/program-detail/ProgramDetailSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only: both fetches for this screen happen here, once.
 *
 * A query rather than params because assignment must read the *current* holder
 * list — a program assigned from two devices would otherwise offer a client
 * who already has it.
 */
export default function AssignProgramScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const programQuery = useProgramDetailQuery(programId ?? '');
  const rosterQuery = useRosterQuery();

  const refresh = useCallback(() => {
    void programQuery.refetch();
    void rosterQuery.refetch();
  }, [programQuery, rosterQuery]);

  if (programQuery.isPending || rosterQuery.isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Assign program"
          eyebrow="Your roster"
          backLabel="Program"
        />
        <ProgramDetailSkeleton />
      </LISafeArea>
    );
  }

  if (programQuery.error || !programQuery.data || rosterQuery.error || !rosterQuery.data) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Assign program"
          eyebrow="Your roster"
          backLabel="Program"
        />
        <LIErrorState
          message={programQuery.error?.message ?? rosterQuery.error?.message}
          onRetry={refresh}
        />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
        title="Assign program"
        eyebrow="Your roster"
        backLabel="Program"
      />
      <AssignContent program={programQuery.data} clients={rosterQuery.data.clients} />
    </LISafeArea>
  );
}
