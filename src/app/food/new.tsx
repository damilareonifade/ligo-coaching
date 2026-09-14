import { LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import NewFoodForm from '@/screens/food-new/NewFoodForm';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
export default function NewFoodScreen() {
  return (
    <LISafeArea>
      <ScreenHeader
        title="New food"
        eyebrow="Custom food"
        backLabel="Add food"
      />
      <NewFoodForm />
    </LISafeArea>
  );
}
