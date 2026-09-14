import { useEffect, useMemo } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import type { BuilderKind } from '@/api/types';
import { LISegmented, type LISegmentedOption } from '@/components/ui';
import BuilderRoutineName from '@/components/builder/BuilderRoutineName';
import { selectDraftRoutine, useProgramDraftStore } from '@/store/programDraftStore';

import BuilderBlockList from '@/components/builder/BuilderBlockList';
import BuilderRoutineTabs from './BuilderRoutineTabs';
import BuilderSaveFooter from './BuilderSaveFooter';
import BuilderSetupCard from '@/components/builder/BuilderSetupCard';

const kindOptions: readonly LISegmentedOption[] = [
  { label: 'Routine', value: 'routine' },
  { label: 'Program', value: 'program' },
];

/**
 * The builder holds no server data — it is a draft until it is saved — so it
 * has no query, no skeleton and nothing to retry. `LIForm` provides no keyboard
 * avoidance, so the screen owns it: the name field sits above a long block list.
 */
export default function BuilderContent() {
  const kind = useProgramDraftStore((state) => state.kind);
  const setKind = useProgramDraftStore((state) => state.setKind);
  const reset = useProgramDraftStore((state) => state.reset);
  const routines = useProgramDraftStore((state) => state.routines);
  const selectedRoutine = useProgramDraftStore(selectDraftRoutine);
  const renameRoutine = useProgramDraftStore((state) => state.renameRoutine);

  // A new builder is a blank page. The draft survives the trip to the picker
  // because the store outlives this screen — but not the trip back here later.
  useEffect(() => {
    reset();
  }, [reset]);

  const showDayTabs = useMemo(() => kind === 'program', [kind]);

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
        <LISegmented
          options={kindOptions}
          value={kind}
          onChange={(value) => setKind(value as BuilderKind)}
          testID="builder-kind"
        />

        <BuilderSetupCard />
        {showDayTabs ? (
          <>
            <BuilderRoutineTabs />
            {selectedRoutine ? (
              <BuilderRoutineName
                key={selectedRoutine.id}
                label={selectedRoutine.name}
                fallback={`Day ${routines.indexOf(selectedRoutine) + 1}`}
                onRename={(label) => renameRoutine(selectedRoutine.id, label)}
              />
            ) : null}
          </>
        ) : null}
        <BuilderBlockList />
        <BuilderSaveFooter />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
