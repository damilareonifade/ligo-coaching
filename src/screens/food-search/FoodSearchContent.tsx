import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useFoodSearchQuery, useLogFoodMutation } from '@/api/clientNutrition';
import type { ApiFoodResult } from '@/api/types';
import { LIEmptyState, LIErrorState, LIList, LISegmented } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';

import FoodNoMatchCard from './FoodNoMatchCard';
import FoodResultRow from './FoodResultRow';
import FoodSearchField from './FoodSearchField';
import FoodSearchSkeleton from './FoodSearchSkeleton';

const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Your foods', value: 'yours' },
  { label: 'Recent', value: 'recent' },
] as const;

/**
 * The screen owns the query because the query *is* the local state — the box
 * and the filter are the only inputs, and nothing above this needs them.
 */
export default function FoodSearchContent() {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;
  const searchQuery = useFoodSearchQuery(query, filter);
  const { mutate: logFood, isPending: logging } = useLogFoodMutation();

  const refresh = useCallback(() => {
    void searchQuery.refetch();
  }, [searchQuery]);

  const logResult = useCallback(
    (result: ApiFoodResult) => {
      logFood(
        { foodId: result.id, name: result.name, kcal: result.kcal, meta: result.meta },
        {
          onError: (mutationError) => showToast(errorMessage(mutationError), 'danger'),
        },
      );
      router.back();
    },
    [logFood, router, showToast],
  );

  const renderItem = useCallback(
    ({ item }: { item: ApiFoodResult }) => (
      <FoodResultRow result={item} onPress={logResult} disabled={logging} />
    ),
    [logResult, logging],
  );

  const results = searchQuery.data ?? [];
  // A disabled query reports `isPending` forever — that is "type something",
  // not "loading", so the empty box gets its own branch first.
  const loading = hasQuery && searchQuery.isPending;

  return (
    <View className="flex-1 gap-3 pt-2">
      <View className="gap-3 px-4">
        <FoodSearchField value={query} onChange={setQuery} />
        <LISegmented options={filterOptions} value={filter} onChange={setFilter} />
      </View>

      {!hasQuery ? (
        <LIEmptyState
          title="What did you eat?"
          message="Search by food, brand or meal. Anything you have saved shows up first."
        />
      ) : loading ? (
        <FoodSearchSkeleton />
      ) : searchQuery.error ? (
        <LIErrorState message={searchQuery.error.message} onRetry={refresh} />
      ) : results.length === 0 ? (
        <View className="px-4">
          <FoodNoMatchCard query={trimmed} />
        </View>
      ) : (
        <View className="flex-1">
          <LIList
            data={[...results]}
            keyExtractor={(result) => result.id}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="px-4 pb-8"
            ItemSeparatorComponent={() => <View className="h-3" />}
          />
        </View>
      )}
    </View>
  );
}
