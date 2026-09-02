import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { LIForm, LIFormInput } from '@/components/LIForm';
import { LIButton } from '@/components/ui';

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Passwords are at least 8 characters.'),
});

export type LoginValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  readonly onSubmit: (values: LoginValues) => void;
  readonly submitting: boolean;
}

/** Owns validation only — the sign-in call lives in the route. */
export default function LoginForm({ onSubmit, submitting }: LoginFormProps) {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = form.handleSubmit(onSubmit);

  return (
    <View className="gap-3">
      <LIForm form={form} className="gap-3">
        <LIFormInput<LoginValues>
          name="email"
          placeholder="name@example.com"
          variant="filled"
          inputSize="lg"
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />
        <LIFormInput<LoginValues>
          name="password"
          placeholder="Password"
          variant="filled"
          inputSize="lg"
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <LIButton
          title="Sign in"
          onPress={submit}
          size="lg"
          shape="rounded"
          loading={submitting}
          fullWidth
          testID="sign-in"
        />
      </LIForm>
    </View>
  );
}
