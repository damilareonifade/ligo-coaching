import ScreenHeader from '@/components/chrome/ScreenHeader';
import { LISafeArea } from '@/components/ui';
import ThemeContent from '@/screens/profile-theme/ThemeContent';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only — ScreenHeader sits inside the safe area, which owns the inset.
 *
 * Shared by both sides: a coach and a client choose a theme the same way, so
 * `back` is whichever settings screen they came from.
 */
export default function ThemeScreen() {
  return (
    <LISafeArea>
      <ScreenHeader title="Appearance" eyebrow="Light and dark" backLabel="Back" />
      <ThemeContent />
    </LISafeArea>
  );
}
