import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { errorMessage } from '@/api/client';
import {
  useFinishSessionMutation,
  useLogClientSetMutation,
  useRenameSessionMutation,
  useSetExerciseNoteMutation,
} from '@/api/clientTraining';
import type { ApiClientSession, ApiSessionSet } from '@/api/types';
import {
  draftFromExercises,
  nextSetFor,
  resolveSets,
  totalVolumeKg,
  type SetField,
} from '@/lib/session';
import { useClientSessionStore } from '@/store/clientSessionStore';
import { useUiStore } from '@/store/uiStore';

import SessionAddExercise from './SessionAddExercise';
import SessionEmptyState from './SessionEmptyState';
import SessionExerciseCard from './SessionExerciseCard';
import SessionFinishButton from './SessionFinishButton';
import SessionHeader from './SessionHeader';
import SessionSetBar, { type SetEditTarget } from './SessionSetBar';
import SessionStats from './SessionStats';

interface SessionContentProps {
  readonly session: ApiClientSession;
}

/** Which set the bottom bar is pointed at. Kept by id, not by value. */
interface EditPointer {
  readonly exerciseId: string;
  readonly setN: number;
  readonly field: SetField;
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

  const addSetToDraft = useClientSessionStore((state) => state.addSet);

  const logSet = useLogClientSetMutation();
  const finishSession = useFinishSessionMutation();
  const renameSession = useRenameSessionMutation();
  const setExerciseNote = useSetExerciseNoteMutation();

  const [editing, setEditing] = useState<EditPointer | null>(null);

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
    (exerciseId: string, set: ApiSessionSet, field: SetField) => {
      setEditing({ exerciseId, setN: set.n, field });
    },
    [],
  );

  /**
   * The extra set lands in the draft first so it is on screen instantly and
   * survives a restart, then goes up as an ordinary set write — the endpoint
   * upserts, so adding set 4 and logging set 4 are the same request.
   */
  const handleAddSet = useCallback(
    (exerciseId: string) => {
      const exercise = session.exercises.find((item) => item.id === exerciseId);
      if (!exercise) return;

      const added = nextSetFor(resolveSets(exercise, draft));
      addSetToDraft(exerciseId, added);

      logSet.mutate(
        { sessionId: session.id, exerciseId, set: added },
        { onError: (error) => showToast(errorMessage(error), 'danger') },
      );
    },
    [session.exercises, session.id, draft, addSetToDraft, logSet, showToast],
  );

  const handleRename = useCallback(
    (title: string) => {
      renameSession.mutate(
        { sessionId: session.id, title },
        { onError: (error) => showToast(errorMessage(error), 'danger') },
      );
    },
    [renameSession, session.id, showToast],
  );

  const handleSaveNote = useCallback(
    (exerciseId: string, note: string | null) => {
      setExerciseNote.mutate(
        { sessionId: session.id, exerciseId, note },
        { onError: (error) => showToast(errorMessage(error), 'danger') },
      );
    },
    [setExerciseNote, session.id, showToast],
  );

  /**
   * The pointer is resolved against the live draft on every render rather than
   * copied into the bar, so stepping a value and seeing the chip above it move
   * are the same state change — the two can never disagree.
   */
  const target = useMemo<SetEditTarget | null>(() => {
    if (!editing) return null;

    const exercise = session.exercises.find((item) => item.id === editing.exerciseId);
    if (!exercise) return null;

    const set = resolveSets(exercise, draft).find((item) => item.n === editing.setN);
    if (!set) return null;

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      setN: set.n,
      field: editing.field,
      value: editing.field === 'reps' ? set.reps : set.weightKg,
    };
  }, [editing, session.exercises, draft]);

  const handleSetValue = useCallback(
    (next: number) => {
      if (!editing) return;
      updateSet(
        editing.exerciseId,
        editing.setN,
        editing.field === 'reps' ? { reps: next } : { weightKg: next },
      );
    },
    [editing, updateSet],
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
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-10">
        <SessionHeader
          title={session.title}
          onRename={handleRename}
        />

        <View className="gap-4 px-4">
          <SessionStats
            startedAtMs={startedAtMs ?? Date.parse(session.startedAt)}
            volumeKg={totalVolumeKg(session.exercises, draft)}
          />

          {session.exercises.length === 0 ? (
            <SessionEmptyState />
          ) : (
            session.exercises.map((exercise) => (
              <SessionExerciseCard
                key={exercise.id}
                exercise={exercise}
                sets={resolveSets(exercise, draft)}
                activeSetN={editing?.exerciseId === exercise.id ? editing.setN : null}
                activeField={editing?.exerciseId === exercise.id ? editing.field : null}
                onEditSet={handleEditSet}
                onToggleSet={handleToggleSet}
                onAddSet={handleAddSet}
                onSaveNote={handleSaveNote}
              />
            ))
          )}

          <SessionAddExercise sessionId={session.id} />
          <SessionFinishButton onFinish={handleFinish} finishing={finishSession.isPending} />
        </View>
      </ScrollView>

      <SessionSetBar target={target} onChange={handleSetValue} onDone={() => setEditing(null)} />
    </View>
  );
}
