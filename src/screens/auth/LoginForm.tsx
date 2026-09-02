import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { useLoginMutation } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { LIForm, LIFormInput } from '@/components';
import { LIButton, LIText } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Passwords are at least 8 characters.'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useLoginMutation();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = useCallback(
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

  return (
    <View className="flex-1 justify-center gap-6 px-6">
      <View className="gap-2">
        <LIText size="h1" color="primary" text="Ligo" />
        <LIText size="p" color="body" text="Coach. Guide. Progress." />
      </View>

      <LIForm form={form}>
        <LIFormInput<LoginValues>
          name="email"
          label="Email"
          placeholder="you@gym.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <LIFormInput<LoginValues>
          name="password"
          label="Password"
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
        />
        <LIButton
          title="Sign in"
          onPress={form.handleSubmit(onSubmit)}
          loading={isPending}
          fullWidth
        />
      </LIForm>

      <LIText
        size="caption"
        color="muted"
        text="New to Ligo?"
        link
        linkValue="Create a coach account"
        linkHref="/register"
        className="text-center"
      />
    </View>
  );
}
