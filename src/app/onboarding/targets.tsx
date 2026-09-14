import { ScrollView } from 'react-native';

import { LISafeArea } from '@/components/ui';
import TargetsStep from '@/screens/onboarding/TargetsStep';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function TargetsScreen() {
  return (
    <LISafeArea edges={['top', 'bottom']} className="bg-background">
      <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
        <TargetsStep />
      </ScrollView>
    </LISafeArea>
  );
}
