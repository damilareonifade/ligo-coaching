import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { errorMessage } from '@/api/client';
import { useRequestPasswordResetMutation } from '@/api/passwordReset';
import { LIForm, LIFormInput } from '@/components/LIForm';
import { LIButton, LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';

const schema = z.object({ email: z.email('Enter a valid email address.') });

type Values = z.infer<typeof schema>;

export default function ForgotPasswordForm() {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useRequestPasswordResetMutation();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = useCallback(
    async ({ email }: Values) => {
      try {
        await mutateAsync(email);
        setSentTo(email.trim().toLowerCase());
      } catch (error) {
        showToast(errorMessage(error), 'danger');
      }
    },
    [mutateAsync, showToast],
  );

  // Deliberately the same screen whether or not the address has an account:
  // telling someone "no such user" hands an attacker a list of who is here.
  if (sentTo !== null) {
    return (
      <View className="flex-1 justify-center gap-6 px-6">
        <View className="gap-3">
          <LIText
            size="h1"
            color="primary"
            text="Check your email"
            className="font-geist-semibold text-foreground"
          />
          <LIText
            size="p"
            color="body"
            text={`If ${sentTo} has a Ligo account, a reset link is on its way. The link opens straight back into the app.`}
            className="font-geist"
          />
          <LIText
            size="caption"
            color="muted"
            text="Links expire after an hour. You can ask for another in a few minutes."
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
          testID="reset-sent-back"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center gap-6 px-6">
      <View className="gap-3">
        <LIText
          size="h1"
          color="primary"
          text="Reset your password"
          className="font-geist-semibold text-foreground"
        />
        <LIText
          size="p"
          color="body"
          text="Enter the address you signed up with and we'll email you a link."
          className="font-geist"
        />
      </View>

      <LIForm form={form}>
        <LIFormInput<Values>
          name="email"
          label="Email"
          labelClassName="text-foreground"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <LIButton
          title="Email me a link"
          onPress={form.handleSubmit(onSubmit)}
          loading={isPending}
          fullWidth
          size="lg"
          shape="rounded"
          className="bg-violet active:bg-violet/90"
          testID="request-reset"
        />
      </LIForm>

      <LIText
        size="caption"
        color="muted"
        text="Signed up with Google? Use Continue with Google instead — there's no password to reset."
        className="text-center font-geist"
      />
    </View>
  );
}
