import { ScrollView } from 'react-native';

import { LISafeArea } from '@/components/ui';
import GoalsStep from '@/screens/onboarding/GoalsStep';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function GoalsScreen() {
  return (
    <LISafeArea edges={['top', 'bottom']} className="bg-background">
      <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
        <GoalsStep />
      </ScrollView>
    </LISafeArea>
  );
}
