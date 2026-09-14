import { LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import NewExerciseForm from '@/screens/new-exercise/NewExerciseForm';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
export default function NewExerciseScreen() {
  return (
    <LISafeArea>
      <ScreenHeader
        title="New exercise"
        eyebrow="Custom exercise"
        backLabel="Add exercise"
      />
      <NewExerciseForm />
    </LISafeArea>
  );
}
