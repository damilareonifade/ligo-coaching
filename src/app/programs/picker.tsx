import { LISafeArea } from '@/components/ui';
import PickerContent from '@/screens/exercise-picker/PickerContent';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so no safe-area edges here. */
export default function ExercisePickerScreen() {
  return (
    <LISafeArea edges={[]}>
      <PickerContent />
    </LISafeArea>
  );
}
