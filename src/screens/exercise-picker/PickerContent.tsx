import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useExerciseOptionsQuery, useProgramDetailQuery } from '@/api/coachPrograms';
import type { ApiExerciseOption } from '@/api/types';
import { LIErrorState, LIList, LIText } from '@/components/ui';
import { useAddExerciseToTarget } from '@/hooks/useAddExerciseToTarget';
import { groupExerciseOptions, type ExerciseFilter } from '@/lib/programs';
import { selectDraftDay, useProgramDraftStore } from '@/store/programDraftStore';

import PickerCreateCard from './PickerCreateCard';
import PickerFilters from './PickerFilters';
import PickerNotice from './PickerNotice';
import PickerResultRow from './PickerResultRow';
import PickerSearchField from './PickerSearchField';
import PickerSkeleton from './PickerSkeleton';

/** Section headers and rows in one list, so FlashList still recycles the rows. */
type PickerRow =
  | { readonly kind: 'header'; readonly id: string; readonly title: string }
  | { readonly kind: 'option'; readonly id: string; readonly option: ApiExerciseOption };

/**
 * The screen owns the search box and the filter because the two of them *are*
 * the query — the same reasoning as the food search, and nothing above this
 * route needs either value.
 */
export default function PickerContent() {
  const router = useRouter();
  const { programId, dayId } = useLocalSearchParams<{
    programId?: string;
    dayId?: string;
  }>();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ExerciseFilter>('all');

  const optionsQuery = useExerciseOptionsQuery(query, filter);
  // One path for both destinations — a saved program or the builder's draft.
  const { addExercise, adding: saving } = useAddExerciseToTarget({ programId, dayId });
  const programQuery = useProgramDetailQuery(programId ?? '');

  const draftDay = useProgramDraftStore(selectDraftDay);
  const draftName = useProgramDraftStore((state) => state.name);

  const program = programQuery.data ?? null;
  const targetDay = useMemo(() => {
    if (!program) return null;
    return program.days.find((day) => day.id === dayId) ?? program.days[0] ?? null;
  }, [program, dayId]);

  const options = useMemo(() => optionsQuery.data ?? [], [optionsQuery.data]);

  const rows = useMemo<readonly PickerRow[]>(
    () =>
      groupExerciseOptions(options).flatMap((group) => [
        { kind: 'header' as const, id: `header-${group.id}`, title: group.title },
        ...group.options.map((option) => ({
          kind: 'option' as const,
          id: option.id,
          option,
        })),
      ]),
    [options],
  );

  const add = useCallback(
    (option: ApiExerciseOption) => {
      addExercise(option.name);
      // Back either way: picking an exercise is one decision, and staying here
      // would leave the coach wondering whether the tap landed.
      router.back();
    },
    [addExercise, router],
  );

  const refresh = useCallback(() => {
    void optionsQuery.refetch();
  }, [optionsQuery]);

  const renderItem = useCallback(
    ({ item }: { item: PickerRow }) =>
      item.kind === 'header' ? (
        <LIText
          size="caption"
          color="muted"
          text={item.title}
          className="px-1 pb-1 pt-2 font-geist-medium uppercase tracking-wide"
        />
      ) : (
        <PickerResultRow option={item.option} onAdd={add} disabled={saving} />
      ),
    [add, saving],
  );

  const noticeDayLabel = programId ? (targetDay?.label ?? '') : (draftDay?.label ?? 'Exercises');
  const noticeProgramName = programId
    ? (program?.name ?? '')
    : draftName.trim().length > 0
      ? draftName.trim()
      : 'New program';

  return (
    <View className="flex-1 gap-3 pt-2">
      <View className="gap-3 px-4">
        {noticeProgramName.length > 0 && noticeDayLabel.length > 0 ? (
          <PickerNotice dayLabel={noticeDayLabel} programName={noticeProgramName} />
        ) : null}
        <PickerSearchField value={query} onChange={setQuery} resultCount={options.length} />
        <PickerFilters value={filter} onChange={setFilter} />
      </View>

      {optionsQuery.isPending ? (
        <PickerSkeleton />
      ) : optionsQuery.error ? (
        <LIErrorState message={optionsQuery.error.message} onRetry={refresh} />
      ) : (
        <View className="flex-1">
          <LIList
            data={[...rows]}
            keyExtractor={(row) => row.id}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="px-4 pb-10"
            ItemSeparatorComponent={() => <View className="h-2" />}
            ListEmptyComponent={
              <LIText
                size="caption"
                color="muted"
                text="Nothing matches that. Create it below and it stays in your library."
                className="px-1 py-2 font-geist"
              />
            }
            ListFooterComponent={
              <View className="pt-4">
                <PickerCreateCard />
              </View>
            }
          />
        </View>
      )}
    </View>
  );
}
