import { ScrollView } from 'react-native';

import { LISafeArea } from '@/components/ui';
import OnboardingWelcome from '@/screens/onboarding/OnboardingWelcome';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function WelcomeScreen() {
  return (
    <LISafeArea edges={['top', 'bottom']} className="bg-canvas">
      <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
        <OnboardingWelcome />
      </ScrollView>
    </LISafeArea>
  );
}
