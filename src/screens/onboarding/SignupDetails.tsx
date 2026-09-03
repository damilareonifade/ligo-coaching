import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { useSignupMutation } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { LIForm, LIFormInput } from '@/components/LIForm';
import { LIBadge, LIButton, LIText } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useUiStore } from '@/store/uiStore';

const detailsSchema = z.object({
  name: z.string().min(2, 'Tell us your name.'),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Passwords are at least 8 characters.'),
});

type DetailsValues = z.infer<typeof detailsSchema>;

export default function SignupDetails() {
  const router = useRouter();
  const role = useOnboardingStore((state) => state.role);
  const setDetails = useOnboardingStore((state) => state.setDetails);
  const signIn = useAuthStore((state) => state.signIn);
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useSignupMutation();

  // Defensive: someone deep-linked or reloaded mid-flow with no role chosen.
  useEffect(() => {
    if (role === null) {
      router.replace('/signup/role');
    }
  }, [role, router]);

  const form = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = useCallback(
    async (values: DetailsValues) => {
      if (role === null) return;
      try {
        const result = await mutateAsync({ role, ...values });
        await signIn(result);
        setDetails({ name: values.name, email: values.email });
        router.replace(role === 'coach' ? '/onboarding/coach-profile' : '/onboarding/welcome');
      } catch (error) {
        showToast(errorMessage(error), 'danger');
      }
    },
    [mutateAsync, role, router, setDetails, showToast, signIn],
  );

  if (role === null) return null;

  return (
    <View className="flex-1 justify-center gap-6 px-6">
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <LIBadge
            label={role === 'coach' ? 'Coach' : 'Client'}
            tone="accent"
            className="bg-violet-weak"
            labelClassName="text-violet"
          />
          <LIText
            size="caption"
            color="accent"
            text="Change"
            handleClick={() => router.push('/signup/role')}
            className="font-geist-medium text-violet"
          />
        </View>
        <LIText
          size="h1"
          color="primary"
          text={role === 'coach' ? 'Create your coach account' : 'Create your client account'}
          className="font-geist-semibold text-ink"
        />
        <LIText
          size="p"
          color="body"
          text="Enter your email below to create your account."
          className="font-geist"
        />
      </View>

      <LIForm form={form}>
        <LIFormInput<DetailsValues>
          name="name"
          label="Name"
          labelClassName="text-ink"
          placeholder="Ada Bello"
          autoCapitalize="words"
          description="How coaches and training partners will see you"
        />
        <LIFormInput<DetailsValues>
          name="email"
          label="Email"
          labelClassName="text-ink"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          description="We'll send confirmation here"
        />
        <LIFormInput<DetailsValues>
          name="password"
          label="Password"
          labelClassName="text-ink"
          placeholder="At least 8 characters"
          secureTextEntry
          autoCapitalize="none"
          description="At least 8 characters"
        />
        <LIButton
          title="Sign in with Email"
          onPress={form.handleSubmit(onSubmit)}
          loading={isPending}
          fullWidth
          size="lg"
          shape="rounded"
          className="bg-violet active:bg-violet/90"
          testID="signup-submit"
        />
      </LIForm>

      <LIText
        size="caption"
        color="muted"
        text="By clicking continue, you agree to our Terms of Service and Privacy Policy. Your data is never sold, and never shown to a coach without your permission."
        className="text-center font-geist"
      />
    </View>
  );
}
