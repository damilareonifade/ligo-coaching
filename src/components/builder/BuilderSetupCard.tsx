import { useMemo } from 'react';

import { LICard, LIChipGroup, LIInput, LIText, type LIChipOption } from '@/components/ui';
import {
  ROUTINE_COUNT_OPTIONS,
  WEEK_OPTIONS,
  useProgramDraftStore,
} from '@/store/programDraftStore';

/** The setup a program needs before it has days: a name, a length, a shape. */
export default function BuilderSetupCard() {
  const kind = useProgramDraftStore((state) => state.kind);
  const name = useProgramDraftStore((state) => state.name);
  const note = useProgramDraftStore((state) => state.note);
  const weeks = useProgramDraftStore((state) => state.weeks);
  const routineCount = useProgramDraftStore((state) => state.routines.length);
  const sessionsPerWeek = useProgramDraftStore((state) => state.sessionsPerWeek);
  const setName = useProgramDraftStore((state) => state.setName);
  const setNote = useProgramDraftStore((state) => state.setNote);
  const setWeeks = useProgramDraftStore((state) => state.setWeeks);
  const setRoutineCount = useProgramDraftStore((state) => state.setRoutineCount);
  const setDaysPerWeek = useProgramDraftStore((state) => state.setDaysPerWeek);

  const weekOptions = useMemo<readonly LIChipOption[]>(
    () => WEEK_OPTIONS.map((option) => ({ label: `${option}`, value: `${option}` })),
    [],
  );
  const routineOptions = useMemo<readonly LIChipOption[]>(
    () => ROUTINE_COUNT_OPTIONS.map((option) => ({ label: `${option}`, value: `${option}` })),
    [],
  );

  return (
    <LICard className="gap-4">
      <LIInput
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder={kind === 'routine' ? 'Upper A' : 'Upper/Lower 4×'}
        autoCapitalize="sentences"
        returnKeyType="done"
        accessibilityLabel="Program name"
        testID="builder-name"
      />

      {/* Where the detail that used to be a composed "4 days · 8 weeks" line
          now lives: free text, written by whoever owns the routine. */}
      {kind === 'routine' ? (
        <LIInput
          label="Note"
          value={note}
          onChangeText={setNote}
          placeholder="Anything worth saying about this routine"
          autoCapitalize="sentences"
          multiline
          accessibilityLabel="Routine note"
          testID="builder-note"
        />
      ) : null}

      {/* A routine is a single session, so weeks and days would be answers to
          questions it never asks. */}
      {kind === 'program' ? (
        <>
          <LIChipGroup
            label="Weeks"
            options={weekOptions}
            value={`${weeks}`}
            onChange={(value) => setWeeks(Number(value))}
            testID="builder-weeks"
          />
          <LIChipGroup
            label="Routines"
            options={routineOptions}
            value={`${routineCount}`}
            onChange={(value) => setRoutineCount(Number(value))}
            testID="builder-days"
          />
          {/* How often, not which days. The program is a rotation the client
              works through at their own pace, so this is a target to measure
              against and never a schedule. */}
          <LIChipGroup
            label="Times a week"
            options={routineOptions}
            value={`${sessionsPerWeek}`}
            onChange={(value) => setDaysPerWeek(Number(value))}
            testID="builder-days-per-week"
          />
          <LIText
            size="caption"
            color="muted"
            text="A target, not a timetable — clients pick their own days and work through the split in order."
            className="font-geist"
          />
        </>
      ) : null}
    </LICard>
  );
}
