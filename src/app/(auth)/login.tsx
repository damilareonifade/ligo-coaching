import { KeyboardAvoidingView, Platform } from 'react-native';

import { LISafeArea } from '@/components/ui';
import LoginForm from '@/screens/auth/LoginForm';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function LoginScreen() {
  return (
    <LISafeArea edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <LoginForm />
      </KeyboardAvoidingView>
    </LISafeArea>
  );
}
