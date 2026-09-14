import { LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import RoutineBuilderContent from '@/screens/routine-builder/RoutineBuilderContent';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
export default function NewRoutineScreen() {
  return (
    <LISafeArea>
      <ScreenHeader
        title="Builder"
        eyebrow="Your routine"
        backLabel="Back"
      />
      <RoutineBuilderContent />
    </LISafeArea>
  );
}
