import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { errorMessage } from '@/api/client';
import { useAdjustLiveSetMutation } from '@/api/coachClient';
import type { ApiLiveSession } from '@/api/types';
import { useUiStore } from '@/store/uiStore';
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

/**
 * Watching, and — where the client allowed it — changing what is still to come.
 *
 * Every fetch and every write for the screen is here; the cards below take
 * data and callbacks. `session.canEdit` is the client's own `log_for` switch,
 * so a coach without it sees exactly what this screen always showed.
 */
export default function LiveContent({ session, refreshing, onRefresh }: LiveContentProps) {
  const elapsedMs = useElapsedMs(Date.parse(session.startedAt));
  const showToast = useUiStore((state) => state.showToast);
  const adjust = useAdjustLiveSetMutation();
  const [savingSetId, setSavingSetId] = useState<string | null>(null);

  const handleAdjust = useCallback(
    (setId: string, weightKg: number, reps: number) => {
      setSavingSetId(setId);
      adjust.mutate(
        { clientId: session.clientId, setId, weightKg, reps },
        {
          onError: (error) => showToast(errorMessage(error), 'danger'),
          onSettled: () => setSavingSetId(null),
        },
      );
    },
    [adjust, session.clientId, showToast],
  );

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
        <LiveExerciseCard
          key={exercise.id}
          exercise={exercise}
          canEdit={session.canEdit}
          onAdjust={handleAdjust}
          savingSetId={savingSetId}
        />
      ))}

      <LiveActions clientId={session.clientId} clientName={session.clientName} />
    </ScrollView>
  );
}
