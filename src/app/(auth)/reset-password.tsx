import { useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { LISafeArea } from '@/components/ui';
import ResetPasswordForm from '@/screens/auth/ResetPasswordForm';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Opened by the link in the reset email — `ligo://reset-password?code=…`.
 * The code is a route param rather than something the screen re-parses,
 * because expo-router has already done the work.
 */
export default function ResetPasswordScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();

  return (
    <LISafeArea edges={['top', 'bottom']} className="bg-canvas">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
          <ResetPasswordForm code={typeof code === 'string' && code.length > 0 ? code : null} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LISafeArea>
  );
}
