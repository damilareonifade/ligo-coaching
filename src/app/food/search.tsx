import { LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import FoodSearchContent from '@/screens/food-search/FoodSearchContent';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
export default function FoodSearchScreen() {
  return (
    <LISafeArea>
      <ScreenHeader
        title="Add food"
        eyebrow="Food library"
        backLabel="Food"
      />
      <FoodSearchContent />
    </LISafeArea>
  );
}
