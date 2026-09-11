import { LISafeArea } from '@/components/ui';
import FoodSearchContent from '@/screens/food-search/FoodSearchContent';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so no safe-area edges here. */
export default function FoodSearchScreen() {
  return (
    <LISafeArea edges={[]}>
      <FoodSearchContent />
    </LISafeArea>
  );
}
