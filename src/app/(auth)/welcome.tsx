import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { LISafeArea } from '@/components/ui';
import { WelcomeAccountPicker } from '@/screens/welcome/WelcomeAccountPicker';
import { WelcomeCarousel } from '@/screens/welcome/WelcomeCarousel';
import type { WelcomeTrack } from '@/screens/welcome/slides';
import { useLastAccountStore } from '@/store/lastAccountStore';
import { useOnboardingStore } from '@/store/onboardingStore';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * The first screen on a signed-out phone.
 *
 * Composer only: the carousel owns which slide is showing, the picker owns
 * its own confirmation, and everything that leaves the screen is decided
 * here.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const account = useLastAccountStore((state) => state.account);
  const forget = useLastAccountStore((state) => state.forget);
  const setRole = useOnboardingStore((state) => state.setRole);

  // Which half of the app the carousel is pitching. Seeded from the account
  // this device last signed in as, because that is the better guess than
  // either default — and it is only ever a guess: the role screen still asks.
  const [track, setTrack] = useState<WelcomeTrack>(account?.role ?? 'client');

  const handleCreateAccount = useCallback(() => {
    // Carried over as a pre-selection, not a decision. `/signup/role` renders
    // the card already chosen and the person can pick the other one — which
    // is the whole reason the toggle is worth wiring up rather than leaving
    // it to change nothing but the copy.
    setRole(track);
    router.push('/signup/role');
  }, [router, setRole, track]);

  const handleContinue = useCallback(() => {
    if (!account) return;
    // The address travels; nothing else does. There is no session to resume
    // here — this is the sign-in form with one field already filled.
    router.push({ pathname: '/login', params: { email: account.email } });
  }, [account, router]);

  const handleUseAnother = useCallback(() => {
    router.push('/login');
  }, [router]);

  return (
    // No insets on the root: the backdrop runs under the status bar, and the
    // two children take the insets they each need. The status bar itself is
    // the root layout's to set — it already follows the theme, and this
    // screen has no reason to disagree with it now that the field does too.
    <LISafeArea edges={[]} className="bg-background">
      <WelcomeCarousel track={track} onTrackChange={setTrack} />
      <WelcomeAccountPicker
        account={account}
        onContinue={handleContinue}
        onUseAnother={handleUseAnother}
        onCreateAccount={handleCreateAccount}
        onForget={forget}
      />
    </LISafeArea>
  );
}
