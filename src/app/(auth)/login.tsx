import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { useLoginMutation } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { LISafeArea } from '@/components/ui';
import LoginFooter from '@/screens/auth/LoginFooter';
import LoginForm, { type LoginValues } from '@/screens/auth/LoginForm';
import LoginHeader from '@/screens/auth/LoginHeader';
import LoginPrivacyNote from '@/screens/auth/LoginPrivacyNote';
import SocialSignIn from '@/screens/auth/SocialSignIn';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only: the sign-in call happens here and results flow down as props. */
export default function LoginScreen() {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useLoginMutation();

  const handleSubmit = useCallback(
    async (values: LoginValues) => {
      try {
        const result = await mutateAsync(values);
        await signIn(result);
        router.replace('/');
      } catch (error) {
        showToast(errorMessage(error), 'danger');
      }
    },
    [mutateAsync, router, showToast, signIn],
  );

  // No OAuth client or passkey relying party is configured yet — say so rather
  // than failing silently. See README "Not built yet".
  const handleUnavailable = useCallback(
    (method: string) => () => showToast(`${method} sign-in is not connected yet.`, 'info'),
    [showToast],
  );

  return (
    <LISafeArea className="bg-sky" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 pb-4"
          keyboardShouldPersistTaps="handled"
        >
          <LoginHeader />

          <View className="gap-6 pt-8">
            <LoginForm onSubmit={(values) => void handleSubmit(values)} submitting={isPending} />
            <SocialSignIn
              onGoogle={handleUnavailable('Google')}
              onPasskey={handleUnavailable('Passkey')}
              busy={isPending}
            />
            <LoginPrivacyNote />
          </View>

          <View className="mt-auto pt-10">
            <LoginFooter />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LISafeArea>
  );
}
