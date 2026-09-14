import { useMemo } from 'react';

import { LICard, LIChipGroup, LIInput, type LIChipOption } from '@/components/ui';
import {
  DAY_COUNT_OPTIONS,
  WEEK_OPTIONS,
  useProgramDraftStore,
} from '@/store/programDraftStore';

/** The setup a program needs before it has days: a name, a length, a shape. */
export default function BuilderSetupCard() {
  const kind = useProgramDraftStore((state) => state.kind);
  const name = useProgramDraftStore((state) => state.name);
  const weeks = useProgramDraftStore((state) => state.weeks);
  const dayCount = useProgramDraftStore((state) => state.days.length);
  const setName = useProgramDraftStore((state) => state.setName);
  const setWeeks = useProgramDraftStore((state) => state.setWeeks);
  const setDayCount = useProgramDraftStore((state) => state.setDayCount);

  const weekOptions = useMemo<readonly LIChipOption[]>(
    () => WEEK_OPTIONS.map((option) => ({ label: `${option}`, value: `${option}` })),
    [],
  );
  const dayOptions = useMemo<readonly LIChipOption[]>(
    () => DAY_COUNT_OPTIONS.map((option) => ({ label: `${option}`, value: `${option}` })),
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
            label="Days"
            options={dayOptions}
            value={`${dayCount}`}
            onChange={(value) => setDayCount(Number(value))}
            testID="builder-days"
          />
        </>
      ) : null}
    </LICard>
  );
}
