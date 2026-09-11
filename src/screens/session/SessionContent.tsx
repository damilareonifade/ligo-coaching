import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { ScrollView } from 'react-native';

import { errorMessage } from '@/api/client';
import { useFinishSessionMutation, useLogClientSetMutation } from '@/api/clientTraining';
import type { ApiClientSession, ApiSessionSet } from '@/api/types';
import { draftFromExercises, resolveSets, totalVolumeKg } from '@/lib/session';
import { useClientSessionStore } from '@/store/clientSessionStore';
import { useUiStore } from '@/store/uiStore';

import SessionAddExercise from './SessionAddExercise';
import SessionExerciseCard from './SessionExerciseCard';
import SessionFinishButton from './SessionFinishButton';
import SessionStats from './SessionStats';

interface SessionContentProps {
  readonly session: ApiClientSession;
}

/** Every write for the active workout happens here; the cards below take props. */
export default function SessionContent({ session }: SessionContentProps) {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);

  const startedAtMs = useClientSessionStore((state) => state.startedAtMs);
  const draft = useClientSessionStore((state) => state.sets);
  const startDraft = useClientSessionStore((state) => state.start);
  const hydrate = useClientSessionStore((state) => state.hydrate);
  const toggleSet = useClientSessionStore((state) => state.toggleSet);
  const updateSet = useClientSessionStore((state) => state.updateSet);
  const finishDraft = useClientSessionStore((state) => state.finish);

  const logSet = useLogClientSetMutation();
  const finishSession = useFinishSessionMutation();

  // Resuming after a restart, or landing here from a deep link, both arrive
  // with an empty draft. `start` no-ops on the session already open, and
  // `hydrate` only fills exercises that carry no local edits.
  useEffect(() => {
    startDraft(session.id);
    hydrate(draftFromExercises(session.exercises));
  }, [hydrate, session.exercises, session.id, startDraft]);

  const handleToggleSet = useCallback(
    (exerciseId: string, set: ApiSessionSet) => {
      const next: ApiSessionSet = { ...set, completed: !set.completed };
      toggleSet(exerciseId, set.n);

      logSet.mutate(
        { sessionId: session.id, exerciseId, set: next },
        {
          onError: (error) => {
            // Put the tick back where it was — the write never landed.
            toggleSet(exerciseId, set.n);
            showToast(errorMessage(error), 'danger');
          },
        },
      );
    },
    [logSet, session.id, showToast, toggleSet],
  );

  const handleEditSet = useCallback(
    (exerciseId: string, n: number, weightKg: number, reps: number) => {
      updateSet(exerciseId, n, { weightKg, reps });
    },
    [updateSet],
  );

  const handleFinish = useCallback(() => {
    void (async () => {
      try {
        await finishSession.mutateAsync({ sessionId: session.id });
        finishDraft();
        router.replace('/');
      } catch (error) {
        showToast(errorMessage(error), 'danger');
      }
    })();
  }, [finishDraft, finishSession, router, session.id, showToast]);

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 px-4 pb-10 pt-2">
      <SessionStats
        startedAtMs={startedAtMs ?? Date.parse(session.startedAt)}
        volumeKg={totalVolumeKg(session.exercises, draft)}
      />

      {session.exercises.map((exercise) => (
        <SessionExerciseCard
          key={exercise.id}
          exercise={exercise}
          sets={resolveSets(exercise, draft)}
          onToggleSet={handleToggleSet}
          onEditSet={handleEditSet}
        />
      ))}

      <SessionAddExercise />
      <SessionFinishButton onFinish={handleFinish} finishing={finishSession.isPending} />
    </ScrollView>
  );
}
