import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { useLoginMutation } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { useGoogleSignInMutation } from '@/api/googleAuth';
import { LISafeArea, LIText } from '@/components/ui';
import LoginFooter from '@/screens/auth/LoginFooter';
import LoginForm, { type LoginValues } from '@/screens/auth/LoginForm';
import LoginHeader from '@/screens/auth/LoginHeader';
import LoginPrivacyNote from '@/screens/auth/LoginPrivacyNote';
import SocialSignIn from '@/components/auth/SocialSignIn';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only: the sign-in call happens here and results flow down as props. */
export default function LoginScreen() {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useLoginMutation();
  const { mutateAsync: signInWithGoogle, isPending: googlePending } = useGoogleSignInMutation();

  const handleSubmit = useCallback(
    async (values: LoginValues) => {
      try {
        const result = await mutateAsync(values);
        // The profile decides both gates in the tab layout — whether a role is
        // still owed, and whether onboarding was ever finished. Routing to '/'
        // is right either way: the layout redirects from there.
        await signIn(result.session, result.profile);
        router.replace('/');
      } catch (error) {
        showToast(errorMessage(error), 'danger');
      }
    },
    [mutateAsync, router, showToast, signIn],
  );

  const handleGoogle = useCallback(async () => {
    try {
      // No role from this screen: someone signing in already has an account,
      // and a brand-new Google account gets asked on the next screen.
      const result = await signInWithGoogle(null);
      // Null means the browser was dismissed before Google answered — that is
      // a choice, not a failure, so leave the screen as it was.
      if (!result) return;
      await signIn(result.session, result.profile);
      router.replace(result.profile.roleConfirmed ? '/' : '/onboarding/choose-role');
    } catch (error) {
      showToast(errorMessage(error), 'danger');
    }
  }, [router, showToast, signIn, signInWithGoogle]);

  // No passkey relying party is configured yet — say so rather than failing
  // silently. See README "Not built yet".
  const handleUnavailable = useCallback(
    (method: string) => () => showToast(`${method} sign-in is not connected yet.`, 'info'),
    [showToast],
  );

  return (
    <LISafeArea className="bg-background" edges={['top', 'bottom']}>
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
            <LIText
              size="caption"
              color="accent"
              text="Forgot your password?"
              handleClick={() => router.push('/forgot-password')}
              className="text-center font-geist-medium text-violet"
              testID="forgot-password-link"
            />
            <SocialSignIn
              onGoogle={() => void handleGoogle()}
              onPasskey={handleUnavailable('Passkey')}
              busy={isPending || googlePending}
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
