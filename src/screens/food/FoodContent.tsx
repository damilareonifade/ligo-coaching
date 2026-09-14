import { RefreshControl, ScrollView } from 'react-native';

import type { ApiFoodDay, ApiQuickFood } from '@/api/types';
import { useThemeTokens } from '@/theme/tokens';

import FoodLoggedList from './FoodLoggedList';
import FoodQuickAdd from './FoodQuickAdd';
import FoodSearchEntry from './FoodSearchEntry';
import FoodSummaryCard from './FoodSummaryCard';

interface FoodContentProps {
  readonly day: ApiFoodDay;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
  readonly onQuickAdd: (food: ApiQuickFood) => void;
  readonly adding: boolean;
}

export default function FoodContent({
  day,
  refreshing,
  onRefresh,
  onQuickAdd,
  adding,
}: FoodContentProps) {
  const tokens = useThemeTokens();
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-4 pb-8 pt-2"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
      }
    >
      <FoodSummaryCard
        kcalConsumed={day.kcalConsumed}
        kcalTarget={day.kcalTarget}
        macros={day.macros}
      />
      <FoodSearchEntry />
      <FoodLoggedList logged={day.logged} />
      <FoodQuickAdd quickAdd={day.quickAdd} onAdd={onQuickAdd} adding={adding} />
    </ScrollView>
  );
}
