import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { LISafeArea } from '@/components/ui';
import ForgotPasswordForm from '@/screens/auth/ForgotPasswordForm';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function ForgotPasswordScreen() {
  return (
    <LISafeArea edges={['top', 'bottom']} className="bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
          <ForgotPasswordForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </LISafeArea>
  );
}
