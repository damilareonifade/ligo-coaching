import { KeyRound } from 'lucide-react-native';
import { View } from 'react-native';

import { LIButton, LIGoogleIcon, LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

interface SocialSignInProps {
  readonly onGoogle: () => void;
  readonly onPasskey: () => void;
  readonly busy?: boolean;
}

export default function SocialSignIn({ onGoogle, onPasskey, busy = false }: SocialSignInProps) {
  return (
    <View className="gap-3">
      <LIText size="caption" color="muted" text="Or continue with" className="text-center" />

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
    </View>
  );
}
