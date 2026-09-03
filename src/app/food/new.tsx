import { LISafeArea } from '@/components/ui';
import NewFoodForm from '@/screens/food-new/NewFoodForm';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so no safe-area edges here. */
export default function NewFoodScreen() {
  return (
    <LISafeArea edges={[]}>
      <NewFoodForm />
    </LISafeArea>
  );
}
