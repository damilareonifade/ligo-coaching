import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { errorMessage } from '@/api/client';
import { startPasswordRecovery, useCompletePasswordResetMutation } from '@/api/passwordReset';
import { LIForm, LIFormInput } from '@/components/LIForm';
import { LIButton, LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';

const schema = z
  .object({
    password: z.string().min(8, 'Passwords are at least 8 characters.'),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: 'Those passwords do not match.',
    path: ['confirm'],
  });

type Values = z.infer<typeof schema>;

interface ResetPasswordFormProps {
  /** The `code` query param from the emailed link. */
  readonly code: string | null;
}

type Stage =
  | { readonly kind: 'exchanging' }
  | { readonly kind: 'ready'; readonly email: string }
  | { readonly kind: 'invalid'; readonly message: string };

export default function ResetPasswordForm({ code }: ResetPasswordFormProps) {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const { mutateAsync, isPending } = useCompletePasswordResetMutation();
  // A link with no code is knowable from the props, so it is the initial
  // state rather than something an effect discovers and re-renders into.
  const [stage, setStage] = useState<Stage>(() =>
    code === null
      ? { kind: 'invalid', message: 'That link is missing its reset code.' }
      : { kind: 'exchanging' },
  );

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  // The link carries a one-time code; trading it for a recovery session is
  // what authorises the password change below.
  useEffect(() => {
    if (code === null) return;

    let cancelled = false;
    void startPasswordRecovery(code)
      .then((email) => {
        if (!cancelled) setStage({ kind: 'ready', email });
      })
      .catch((error: unknown) => {
        if (!cancelled) setStage({ kind: 'invalid', message: errorMessage(error) });
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  const onSubmit = useCallback(
    async ({ password }: Values) => {
      if (stage.kind !== 'ready') return;
      try {
        await mutateAsync({ password });
        showToast('Password updated. Sign in with your new password.', 'success');
        router.replace('/login');
      } catch (error) {
        showToast(errorMessage(error), 'danger');
      }
    },
    [mutateAsync, router, showToast, stage],
  );

  if (stage.kind === 'exchanging') {
    return (
      <View className="flex-1 justify-center gap-3 px-6">
        <LIText
          size="h1"
          color="primary"
          text="Checking your link"
          className="font-geist-semibold text-foreground"
        />
        <LIText size="p" color="body" text="One moment." className="font-geist" />
      </View>
    );
  }

  if (stage.kind === 'invalid') {
    return (
      <View className="flex-1 justify-center gap-6 px-6">
        <View className="gap-3">
          <LIText
            size="h1"
            color="primary"
            text="That link has expired"
            className="font-geist-semibold text-foreground"
          />
          <LIText size="p" color="body" text={stage.message} className="font-geist" />
        </View>
        <LIButton
          title="Request a new link"
          onPress={() => router.replace('/forgot-password')}
          fullWidth
          size="lg"
          shape="rounded"
          className="bg-violet active:bg-violet/90"
          testID="reset-retry"
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
          text="Choose a new password"
          className="font-geist-semibold text-foreground"
        />
        <LIText
          size="p"
          color="body"
          text={`Setting a new password for ${stage.email}.`}
          className="font-geist"
        />
      </View>

      <LIForm form={form}>
        <LIFormInput<Values>
          name="password"
          label="New password"
          labelClassName="text-foreground"
          placeholder="At least 8 characters"
          secureTextEntry
          autoCapitalize="none"
        />
        <LIFormInput<Values>
          name="confirm"
          label="Confirm password"
          labelClassName="text-foreground"
          placeholder="Type it again"
          secureTextEntry
          autoCapitalize="none"
        />
        <LIButton
          title="Save password"
          onPress={form.handleSubmit(onSubmit)}
          loading={isPending}
          fullWidth
          size="lg"
          shape="rounded"
          className="bg-violet active:bg-violet/90"
          testID="save-password"
        />
      </LIForm>
    </View>
  );
}
