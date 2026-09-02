import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useCoachQuery } from '@/api/coach';
import { useLogSetMutation, useTodaySessionsQuery } from '@/api/sessions';
import { useStudentsQuery } from '@/api/students';
import type { ApiSession } from '@/api/types';
import { LIErrorState, LISafeArea } from '@/components/ui';
import DashboardContent from '@/screens/dashboard/DashboardContent';
import DashboardFooter from '@/screens/dashboard/DashboardFooter';
import DashboardHeader from '@/screens/dashboard/DashboardHeader';
import DashboardSkeleton from '@/screens/dashboard/DashboardSkeleton';
import { useSessionDraftStore } from '@/store/sessionDraftStore';
import { useUiStore } from '@/store/uiStore';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only: every fetch for this screen happens here, once. */
export default function TodayScreen() {
  const coachQuery = useCoachQuery();
  const sessionsQuery = useTodaySessionsQuery();
  const studentsQuery = useStudentsQuery();
  const logSet = useLogSetMutation();

  const showToast = useUiStore((state) => state.showToast);
  const startDraft = useSessionDraftStore((state) => state.start);
  const recordSet = useSessionDraftStore((state) => state.recordSet);
  const [loggingSessionId, setLoggingSessionId] = useState<string | null>(null);

  const handleLogSet = useCallback(
    async (session: ApiSession) => {
      startDraft(session.id);
      setLoggingSessionId(session.id);
      const set = {
        exerciseId: `${session.programId}-set-${session.completedSets + 1}`,
        setIndex: session.completedSets + 1,
        reps: 8,
        weightKg: 0,
      };

      try {
        await logSet.mutateAsync({ sessionId: session.id, set });
        recordSet(set);
      } catch (error) {
        showToast(errorMessage(error), 'danger');
      } finally {
        setLoggingSessionId(null);
      }
    },
    [logSet, recordSet, showToast, startDraft],
  );

  const isPending = sessionsQuery.isPending || studentsQuery.isPending;
  const error = sessionsQuery.error ?? studentsQuery.error;

  const refresh = useCallback(() => {
    void sessionsQuery.refetch();
    void studentsQuery.refetch();
  }, [sessionsQuery, studentsQuery]);

  if (isPending) {
    return (
      <LISafeArea>
        <DashboardSkeleton />
      </LISafeArea>
    );
  }

  if (error) {
    return (
      <LISafeArea>
        <LIErrorState message={error.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  const sessions = sessionsQuery.data ?? [];
  const students = studentsQuery.data ?? [];

  return (
    <LISafeArea>
      <View className="flex-1">
        <DashboardHeader coach={coachQuery.data ?? null} sessionCount={sessions.length} />
        <View className="flex-1">
          <DashboardContent
            sessions={sessions}
            students={students}
            onLogSet={(session) => void handleLogSet(session)}
            loggingSessionId={loggingSessionId}
            refreshing={sessionsQuery.isRefetching}
            onRefresh={refresh}
          />
        </View>
        <DashboardFooter />
      </View>
    </LISafeArea>
  );
}
