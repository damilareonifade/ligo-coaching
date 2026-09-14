import ScreenHeader from '@/components/chrome/ScreenHeader';
import { LISafeArea } from '@/components/ui';
import UnitsContent from '@/screens/profile-units/UnitsContent';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
export default function UnitsScreen() {
  return (
    <LISafeArea>
      <ScreenHeader title="Units" eyebrow="How numbers are shown" backLabel="Profile" />
      <UnitsContent />
    </LISafeArea>
  );
}
