import { LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import PickerContent from '@/screens/exercise-picker/PickerContent';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
export default function ExercisePickerScreen() {
  return (
    <LISafeArea>
      <ScreenHeader
        title="Add exercise"
        eyebrow="Exercise library"
        backLabel="Back"
      />
      <PickerContent />
    </LISafeArea>
  );
}
