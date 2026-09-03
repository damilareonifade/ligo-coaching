import { ScrollView } from 'react-native';

import { LISafeArea } from '@/components/ui';
import CoachPermissionsStep from '@/screens/onboarding/CoachPermissionsStep';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function CoachPermissionsScreen() {
  return (
    <LISafeArea edges={['top', 'bottom']} className="bg-canvas">
      <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
        <CoachPermissionsStep />
      </ScrollView>
    </LISafeArea>
  );
}
