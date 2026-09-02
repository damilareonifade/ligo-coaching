import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useProgramQuery } from '@/api/programs';
import { useStudentQuery, useStudentVolumeQuery } from '@/api/students';
import { LIErrorState, LISafeArea } from '@/components/ui';
import StudentDetailContent from '@/screens/student/StudentDetailContent';
import StudentSkeleton from '@/screens/student/StudentSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const studentId = id ?? '';

  const studentQuery = useStudentQuery(studentId);
  const volumeQuery = useStudentVolumeQuery(studentId);
  // Only runs once the student resolves — `enabled` guards the empty id.
  const programQuery = useProgramQuery(studentQuery.data?.programId ?? '');

  const refresh = useCallback(() => {
    void studentQuery.refetch();
    void volumeQuery.refetch();
  }, [studentQuery, volumeQuery]);

  if (studentQuery.isPending) {
    return (
      <LISafeArea edges={[]}>
        <StudentSkeleton />
      </LISafeArea>
    );
  }

  if (studentQuery.error || !studentQuery.data) {
    return (
      <LISafeArea edges={[]}>
        <LIErrorState message={studentQuery.error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea edges={[]}>
      <StudentDetailContent
        student={studentQuery.data}
        program={programQuery.data ?? null}
        volume={volumeQuery.data ?? []}
        volumeLoading={volumeQuery.isPending}
      />
    </LISafeArea>
  );
}
