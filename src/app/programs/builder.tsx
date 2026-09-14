import { LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import BuilderContent from '@/screens/program-builder/BuilderContent';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
export default function ProgramBuilderScreen() {
  return (
    <LISafeArea>
      <ScreenHeader
        title="Builder"
        eyebrow="New program"
        backLabel="Programs"
      />
      <BuilderContent />
    </LISafeArea>
  );
}
