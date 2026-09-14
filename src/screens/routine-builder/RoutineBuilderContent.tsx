import { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import type { ApiRoutineInstance } from '@/api/types';
import BuilderBlockList from '@/components/builder/BuilderBlockList';
import BuilderSetupCard from '@/components/builder/BuilderSetupCard';
import { useProgramDraftStore } from '@/store/programDraftStore';

import RoutineSaveFooter from './RoutineSaveFooter';

interface RoutineBuilderContentProps {
  /** Absent for a new routine; the saved one to edit otherwise. */
  readonly routine?: ApiRoutineInstance;
  /**
   * Set when the *coach* is editing one client's copy. It changes where the
   * save goes and what the footer promises — a coach's edit here reaches that
   * client and nobody else.
   */
  readonly clientId?: string;
}

/**
 * The client's routine builder — the coach's builder with the program half
 * taken off. `BuilderSetupCard` and `BuilderBlockList` already collapse to a
 * single named list when the draft's kind is `routine`, so both are reused
 * unchanged; only the footer differs, because only the destination differs.
 *
 * No kind toggle: a client builds one session, not a twelve-week block. That
 * is the thing they have a coach for.
 */
export default function RoutineBuilderContent({
  routine,
  clientId,
}: RoutineBuilderContentProps) {
  const reset = useProgramDraftStore((state) => state.reset);
  const setKind = useProgramDraftStore((state) => state.setKind);
  const loadRoutine = useProgramDraftStore((state) => state.loadRoutine);

  // The draft outlives this screen so it survives the trip to the picker — so
  // it also has to be cleared on the way in, or the last one haunts this one.
  useEffect(() => {
    if (routine) {
      loadRoutine(routine.name, routine.note ?? '', routine.blocks);
      return;
    }
    reset();
    setKind('routine');
  }, [routine, loadRoutine, reset, setKind]);

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 pb-10 pt-2"
        keyboardShouldPersistTaps="handled"
      >
        <BuilderSetupCard />
        <BuilderBlockList />
        <RoutineSaveFooter
          routine={routine}
          editingForClientId={clientId}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
