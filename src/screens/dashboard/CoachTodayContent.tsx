import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useCoachQuery } from '@/api/coach';
import { useLogSetMutation, useTodaySessionsQuery } from '@/api/sessions';
import { useStudentsQuery } from '@/api/students';
import type { ApiSession } from '@/api/types';
import { LIErrorState } from '@/components/ui';
import { useSessionDraftStore } from '@/store/sessionDraftStore';
import { useUiStore } from '@/store/uiStore';

import DashboardContent from './DashboardContent';
import DashboardFooter from './DashboardFooter';
import DashboardHeader from './DashboardHeader';
import DashboardSkeleton from './DashboardSkeleton';

/** The coach half of the Today tab: every fetch for the screen happens here. */
export default function CoachTodayContent() {
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

  if (isPending) return <DashboardSkeleton />;
  if (error) return <LIErrorState message={error.message} onRetry={refresh} />;

  const sessions = sessionsQuery.data ?? [];
  const students = studentsQuery.data ?? [];

  return (
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
  );
}
