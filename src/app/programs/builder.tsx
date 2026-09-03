import { LISafeArea } from '@/components/ui';
import BuilderContent from '@/screens/program-builder/BuilderContent';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so no safe-area edges here. */
export default function ProgramBuilderScreen() {
  return (
    <LISafeArea edges={[]}>
      <BuilderContent />
    </LISafeArea>
  );
}
