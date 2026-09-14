import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { LISafeArea } from '@/components/ui';
import SignupDetails from '@/screens/onboarding/SignupDetails';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function DetailsScreen() {
  return (
    <LISafeArea edges={['top', 'bottom']} className="bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
          <SignupDetails />
        </ScrollView>
      </KeyboardAvoidingView>
    </LISafeArea>
  );
}
