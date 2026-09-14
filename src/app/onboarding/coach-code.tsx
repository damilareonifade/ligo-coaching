import { ScrollView } from 'react-native';

import { LISafeArea } from '@/components/ui';
import CoachCodeStep from '@/screens/onboarding/CoachCodeStep';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function CoachCodeScreen() {
  return (
    <LISafeArea edges={['top', 'bottom']} className="bg-background">
      <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
        <CoachCodeStep />
      </ScrollView>
    </LISafeArea>
  );
}
