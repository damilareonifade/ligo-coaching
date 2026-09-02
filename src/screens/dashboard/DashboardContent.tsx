import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import type { ApiSession, ApiStudent } from '@/api/types';
import { LICard, LIEmptyState, LIList, LIText } from '@/components/ui';

import SessionCard from './SessionCard';

interface DashboardContentProps {
  readonly sessions: readonly ApiSession[];
  readonly students: readonly ApiStudent[];
  readonly onLogSet: (session: ApiSession) => void;
  readonly loggingSessionId: string | null;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

export default function DashboardContent({
  sessions,
  students,
  onLogSet,
  loggingSessionId,
  refreshing,
  onRefresh,
}: DashboardContentProps) {
  const router = useRouter();

  const openStudent = useCallback(
    (studentId: string) => router.push(`/student/${studentId}`),
    [router],
  );

  const atRisk = students.filter((student) => student.status === 'at-risk');

  const renderItem = useCallback(
    ({ item }: { item: ApiSession }) => (
      <SessionCard
        session={item}
        onLogSet={onLogSet}
        onOpenStudent={openStudent}
        logging={loggingSessionId === item.id}
      />
    ),
    [loggingSessionId, onLogSet, openStudent],
  );

  return (
    <LIList
      data={[...sessions]}
      keyExtractor={(session) => session.id}
      renderItem={renderItem}
      contentContainerClassName="px-4 pb-8"
      ItemSeparatorComponent={() => <View className="h-3" />}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListHeaderComponent={
        atRisk.length > 0 ? (
          <LICard className="mb-3 bg-light-teal">
            <LIText size="h5" color="primary" text="Needs a nudge" />
            <LIText
              size="p"
              color="body"
              text={`${atRisk.map((student) => student.name.split(' ')[0]).join(', ')} ${
                atRisk.length === 1 ? 'is' : 'are'
              } falling behind on adherence.`}
            />
          </LICard>
        ) : null
      }
      ListEmptyComponent={
        <LIEmptyState
          title="Nothing scheduled"
          message="No sessions today. A good day to write next week's programs."
        />
      }
    />
  );
}
