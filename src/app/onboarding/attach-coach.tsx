import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { LISafeArea } from '@/components/ui';
import AttachCoachStep from '@/screens/onboarding/AttachCoachStep';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function AttachCoachScreen() {
  return (
    <LISafeArea edges={['top', 'bottom']} className="bg-canvas">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
          <AttachCoachStep />
        </ScrollView>
      </KeyboardAvoidingView>
    </LISafeArea>
  );
}
