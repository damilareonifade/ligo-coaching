import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { View } from 'react-native';

import { LIButton, LIText } from '@/components/ui';
import { useFinishOnboarding } from '@/hooks/useFinishOnboarding';
import { useOnboardingStore } from '@/store/onboardingStore';
import { tokens } from '@/theme/tokens';
import { useUiStore } from '@/store/uiStore';

import { OnboardingBackButton } from './OnboardingBackButton';

const CODE_CHARS = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Deterministic, not cryptographic — just stable per name so the demo reads consistently. */
function generateInviteCode(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'SAM-4KQ2';

  const firstWord = trimmed.split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, '');
  const prefix = (firstWord + 'XXX').slice(0, 3);

  let hash = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    hash = (hash * 31 + trimmed.charCodeAt(index)) >>> 0;
  }

  let suffix = '';
  let remaining = hash;
  for (let index = 0; index < 4; index += 1) {
    suffix += CODE_CHARS[remaining % CODE_CHARS.length];
    remaining = Math.floor(remaining / CODE_CHARS.length);
  }

  return `${prefix}-${suffix}`;
}

const EXPECTATIONS = [
  "They'll see your name and specialties before attaching.",
  "You'll only see what they choose to share.",
  'Either of you can detach at any time.',
] as const;

export default function CoachCodeStep() {
  const router = useRouter();
  const name = useOnboardingStore((state) => state.name);
  const finishOnboarding = useFinishOnboarding();
  const showToast = useUiStore((state) => state.showToast);

  const code = generateInviteCode(name);

  const handleFinish = () => {
    finishOnboarding();
    router.replace('/');
  };

  return (
    <View className="flex-1 gap-6 px-6 pt-2">
      <OnboardingBackButton onPress={() => router.back()} />

      <View className="gap-2">
        <LIText
          size="caption"
          color="accent"
          text="Coach setup · 2 of 2"
          className="font-semibold font-geist-medium text-violet"
        />
        <LIText
          size="h1"
          color="primary"
          text="Your invite code"
          className="font-geist-semibold text-ink"
        />
        <LIText
          size="p"
          color="body"
          text="Share it with a client. They attach, then decide what you can see."
          className="font-geist"
        />
      </View>

      <View className="items-center gap-2 rounded-card bg-white py-8">
        <LIText
          size="h1"
          color="primary"
          text={code}
          className="tracking-[6px] font-mono text-ink"
          testID="invite-code"
        />
      </View>

      <View className="flex-row gap-3">
        <LIButton
          title="Copy code"
          onPress={() => showToast('Not connected yet', 'success')}
          variant="outline"
          className="flex-1 border-violet"
          labelClassName="text-violet"
          testID="copy-code"
        />
        <LIButton
          title="Share link"
          onPress={() => showToast('Not connected yet', 'success')}
          variant="outline"
          className="flex-1 border-violet"
          labelClassName="text-violet"
          testID="share-link"
        />
      </View>

      <View className="gap-3">
        {EXPECTATIONS.map((text) => (
          <View key={text} className="flex-row gap-3">
            <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-pill bg-violet">
              <Check color={tokens.white} size={14} />
            </View>
            <LIText size="p" color="body" text={text} className="flex-1 font-geist" />
          </View>
        ))}
      </View>

      <View className="mt-auto pb-4">
        <LIButton
          title="Go to my roster"
          onPress={handleFinish}
          fullWidth
          size="lg"
          shape="rounded"
          className="bg-violet active:bg-violet/90"
          testID="coach-code-finish"
        />
      </View>
    </View>
  );
}
