import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { LISafeArea } from '@/components/ui';
import RegisterForm from '@/screens/auth/RegisterForm';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function RegisterScreen() {
  return (
    <LISafeArea edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
          <RegisterForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </LISafeArea>
  );
}
