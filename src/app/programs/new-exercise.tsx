import { LISafeArea } from '@/components/ui';
import NewExerciseForm from '@/screens/new-exercise/NewExerciseForm';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so no safe-area edges here. */
export default function NewExerciseScreen() {
  return (
    <LISafeArea edges={[]}>
      <NewExerciseForm />
    </LISafeArea>
  );
}
