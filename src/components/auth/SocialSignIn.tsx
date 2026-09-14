import { KeyRound } from 'lucide-react-native';
import { View } from 'react-native';

import { LIButton, LIGoogleIcon, LIText } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

interface SocialSignInProps {
  readonly onGoogle: () => void;
  /** Omit to offer Google alone — the signup role screen has no passkey path. */
  readonly onPasskey?: () => void;
  readonly busy?: boolean;
  readonly label?: string;
}

export default function SocialSignIn({
  onGoogle,
  onPasskey,
  busy = false,
  label = 'Or continue with',
}: SocialSignInProps) {
  const tokens = useThemeTokens();
  return (
    <View className="gap-3">
      <LIText size="caption" color="muted" text={label} className="text-center" />

      <LIButton
        title="Continue with Google"
        onPress={onGoogle}
        variant="social"
        size="lg"
        shape="rounded"
        fullWidth
        disabled={busy}
        icon={<LIGoogleIcon />}
        testID="continue-google"
      />

      {onPasskey ? (
        <LIButton
          title="Continue with a passkey"
          onPress={onPasskey}
          variant="social"
          size="lg"
          shape="rounded"
          fullWidth
          disabled={busy}
          icon={<KeyRound color={tokens.foreground} size={18} />}
          testID="continue-passkey"
        />
      ) : null}
    </View>
  );
}
