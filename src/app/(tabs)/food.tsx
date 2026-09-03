import { useCallback } from 'react';

import { useFoodDayQuery, useLogFoodMutation } from '@/api/clientNutrition';
import { errorMessage } from '@/api/client';
import type { ApiQuickFood } from '@/api/types';
import { LIErrorState, LISafeArea } from '@/components/ui';
import FoodContent from '@/screens/food/FoodContent';
import FoodSkeleton from '@/screens/food/FoodSkeleton';
import { useUiStore } from '@/store/uiStore';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only: every fetch and write for this screen happens here, once. */
export default function FoodScreen() {
  const { data, isPending, error, refetch, isRefetching } = useFoodDayQuery();
  const showToast = useUiStore((state) => state.showToast);
  const { mutate: logFood, isPending: adding } = useLogFoodMutation();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const quickAdd = useCallback(
    (food: ApiQuickFood) => {
      logFood(
        { foodId: food.id, name: food.name, kcal: food.kcal, meta: `${food.meta} · just now` },
        { onError: (mutationError) => showToast(errorMessage(mutationError), 'danger') },
      );
    },
    [logFood, showToast],
  );

  if (isPending) {
    return (
      <LISafeArea>
        <FoodSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <FoodContent
        day={data}
        refreshing={isRefetching}
        onRefresh={refresh}
        onQuickAdd={quickAdd}
        adding={adding}
      />
    </LISafeArea>
  );
}
