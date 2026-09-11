import { RefreshControl, ScrollView } from 'react-native';

import type { ApiLiveSession } from '@/api/types';
import { useElapsedMs } from '@/hooks/useElapsedMs';
import { tokens } from '@/theme/tokens';

import LiveActions from './LiveActions';
import LiveExerciseCard from './LiveExerciseCard';
import LiveHeaderCard from './LiveHeaderCard';
import LiveNotice from './LiveNotice';

interface LiveContentProps {
  readonly session: ApiLiveSession;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

/** Read-only throughout: no mutation is imported here, and none is available. */
export default function LiveContent({ session, refreshing, onRefresh }: LiveContentProps) {
  const elapsedMs = useElapsedMs(Date.parse(session.startedAt));

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-3 px-4 pb-10 pt-2"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
      }
      testID="live-scroll"
    >
      <LiveHeaderCard
        clientName={session.clientName}
        title={session.title}
        elapsedMs={elapsedMs}
      />

      <LiveNotice notice={session.notice} />

      {session.exercises.map((exercise) => (
        <LiveExerciseCard key={exercise.id} exercise={exercise} />
      ))}

      <LiveActions clientId={session.clientId} clientName={session.clientName} />
    </ScrollView>
  );
}
