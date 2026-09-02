import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { useRegisterMutation } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { LIForm, LIFormInput } from '@/components';
import { LIButton, LIText } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

const registerSchema = z.object({
  name: z.string().min(2, 'Tell us your name.'),
  gymName: z.string().min(2, 'Which gym do you coach at?'),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Passwords are at least 8 characters.'),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useRegisterMutation();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', gymName: '', email: '', password: '' },
  });

  const onSubmit = useCallback(
    async (values: RegisterValues) => {
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

  return (
    <View className="flex-1 justify-center gap-6 px-6">
      <View className="gap-2">
        <LIText size="h1" color="primary" text="Create your coach account" />
        <LIText size="p" color="body" text="Your roster, programs, and session logs in one place." />
      </View>

      <LIForm form={form}>
        <LIFormInput<RegisterValues> name="name" label="Your name" placeholder="Ada Bello" autoCapitalize="words" />
        <LIFormInput<RegisterValues> name="gymName" label="Gym" placeholder="Ironworks Lagos" autoCapitalize="words" />
        <LIFormInput<RegisterValues>
          name="email"
          label="Email"
          placeholder="you@gym.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <LIFormInput<RegisterValues>
          name="password"
          label="Password"
          placeholder="At least 8 characters"
          secureTextEntry
          autoCapitalize="none"
        />
        <LIButton
          title="Create account"
          onPress={form.handleSubmit(onSubmit)}
          loading={isPending}
          fullWidth
        />
      </LIForm>

      <LIText
        size="caption"
        color="muted"
        text="Already coaching with Ligo?"
        link
        linkValue="Sign in"
        linkHref="/login"
        className="text-center"
      />
    </View>
  );
}
