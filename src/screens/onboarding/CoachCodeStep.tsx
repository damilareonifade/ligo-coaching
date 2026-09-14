import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { View } from 'react-native';

import { useInviteCodeQuery } from '@/api/coachProfile';
import { LIButton, LISkeleton, LIText } from '@/components/ui';
import { useFinishOnboarding } from '@/hooks/useFinishOnboarding';
import { useInviteCodeActions } from '@/hooks/useInviteCodeActions';
import { useThemeTokens } from '@/theme/tokens';

import { OnboardingBackButton } from './OnboardingBackButton';

const EXPECTATIONS = [
  "They'll see your name and specialties before attaching.",
  "You'll only see what they choose to share.",
  'Either of you can detach at any time.',
] as const;

export default function CoachCodeStep() {
  const tokens = useThemeTokens();
  const router = useRouter();
  const finishOnboarding = useFinishOnboarding();

  // Read, not invented. The code is issued by the database the moment an
  // account becomes a coach, so this screen shows the same one the roster and
  // settings do — which was not true while it was computed from the name here.
  const { data: code, isPending } = useInviteCodeQuery();
  const { copy, share } = useInviteCodeActions(code);

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
          className="font-geist-semibold text-foreground"
        />
        <LIText
          size="p"
          color="body"
          text="Share it with a client. They attach, then decide what you can see."
          className="font-geist"
        />
      </View>

      <View className="items-center gap-2 rounded-card bg-surface py-8">
        {isPending || !code ? (
          <LISkeleton className="h-8 w-48" />
        ) : (
          <LIText
            size="h1"
            color="primary"
            text={code}
            className="tracking-[6px] font-mono text-foreground"
            testID="invite-code"
          />
        )}
      </View>

      <View className="flex-row gap-3">
        <LIButton
          title="Copy code"
          onPress={copy}
          disabled={!code}
          variant="outline"
          className="flex-1 border-violet"
          labelClassName="text-violet"
          testID="copy-code"
        />
        <LIButton
          title="Share code"
          onPress={share}
          disabled={!code}
          variant="outline"
          className="flex-1 border-violet"
          labelClassName="text-violet"
          testID="share-code"
        />
      </View>

      <View className="gap-3">
        {EXPECTATIONS.map((text) => (
          <View key={text} className="flex-row gap-3">
            <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-pill bg-violet">
              <Check color={tokens.inverse} size={14} />
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
