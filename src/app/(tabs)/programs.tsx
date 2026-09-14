import { useCallback } from 'react';

import { useProgramLibraryQuery } from '@/api/coachPrograms';
import { useRosterQuery } from '@/api/roster';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import ProgramsContent from '@/screens/programs/ProgramsContent';
import ProgramsSkeleton from '@/screens/programs/ProgramsSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only. Two queries because a program card shows who holds it, and
 * the people are the roster's — the library stores ids, never names.
 */
export default function ProgramsScreen() {
  const library = useProgramLibraryQuery();
  const roster = useRosterQuery();

  const refresh = useCallback(() => {
    void library.refetch();
    void roster.refetch();
  }, [library, roster]);

  if (library.isPending || roster.isPending) {
    return (
      <LISafeArea>
        <ScreenHeader title="Programs" eyebrow="Your library" />
        <ProgramsSkeleton />
      </LISafeArea>
    );
  }

  if (library.error || !library.data) {
    return (
      <LISafeArea>
        <ScreenHeader title="Programs" eyebrow="Your library" />
        <LIErrorState message={library.error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader title="Programs" eyebrow="Your library" />
      <ProgramsContent
        programs={library.data}
        clients={roster.data?.clients ?? []}
        refreshing={library.isRefetching || roster.isRefetching}
        onRefresh={refresh}
      />
    </LISafeArea>
  );
}
