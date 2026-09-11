import { LISafeArea } from '@/components/ui';
import AttachedConfirmation from '@/screens/onboarding/AttachedConfirmation';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function AttachedScreen() {
  return (
    <LISafeArea edges={['top', 'bottom']} className="bg-canvas">
      <AttachedConfirmation />
    </LISafeArea>
  );
}
