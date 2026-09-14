import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import { completeGoogleRedirect } from '@/api/googleAuth';
import { LIButton, LIText } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';

interface GoogleCallbackProps {
  readonly code: string | null;
  readonly errorDescription: string | null;
}

/**
 * Catches `ligo://auth/callback` when the OS routes it to the app.
 *
 * The usual path never reaches here: `openAuthSessionAsync` intercepts the
 * redirect and hands the URL back to the caller, so the browser sheet closes
 * and no navigation happens. This screen is for when that interception does
 * not happen — the browser was backgrounded mid-flow, or an external browser
 * cold-launched the app — where without a route the code would land on
 * `+not-found` and the sign-in would be silently lost.
 */
export default function GoogleCallback({ code, errorDescription }: GoogleCallbackProps) {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  // Set if they were part-way through signup when the flow was interrupted.
  const role = useOnboardingStore((state) => state.role);
  const setDetails = useOnboardingStore((state) => state.setDetails);

  const [failure, setFailure] = useState<string | null>(errorDescription);
  // An authorization code is single-use; React may run this effect twice.
  const exchanged = useRef(false);

  useEffect(() => {
    if (errorDescription !== null) return;

    if (code === null) {
      // Nothing to complete — someone opened the URL by hand.
      router.replace('/login');
      return;
    }

    if (exchanged.current) return;
    exchanged.current = true;

    let cancelled = false;
    void completeGoogleRedirect(code, role)
      .then(async (result) => {
        if (cancelled) return;
        setDetails({ name: result.profile.name, email: result.profile.email });
        await signIn(result.session, result.profile);
        router.replace(result.roleWasUnconfirmed ? '/onboarding/choose-role' : '/');
      })
      .catch((error: unknown) => {
        if (!cancelled) setFailure(errorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, [code, errorDescription, role, router, setDetails, signIn]);

  if (failure !== null) {
    return (
      <View className="flex-1 justify-center gap-6 px-6">
        <View className="gap-3">
          <LIText
            size="h1"
            color="primary"
            text="Sign-in didn't finish"
            className="font-geist-semibold text-foreground"
          />
          <LIText size="p" color="body" text={failure} className="font-geist" />
          <LIText
            size="caption"
            color="muted"
            text="Google sign-in links can only be used once. Starting again is safe."
            className="font-geist"
          />
        </View>
        <LIButton
          title="Back to sign in"
          onPress={() => router.replace('/login')}
          fullWidth
          size="lg"
          shape="rounded"
          className="bg-violet active:bg-violet/90"
          testID="callback-back-to-login"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center gap-3 px-6">
      <LIText
        size="h1"
        color="primary"
        text="Finishing sign-in"
        className="font-geist-semibold text-foreground"
      />
      <LIText size="p" color="body" text="One moment." className="font-geist" />
    </View>
  );
}
