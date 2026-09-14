import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { View } from 'react-native';

import { LIButton, LIText } from '@/components/ui';
import { useFinishOnboarding } from '@/hooks/useFinishOnboarding';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useThemeTokens } from '@/theme/tokens';

export default function AttachedConfirmation() {
  const tokens = useThemeTokens();
  const router = useRouter();
  const lookedUpCoach = useOnboardingStore((state) => state.lookedUpCoach);
  const finishOnboarding = useFinishOnboarding();
  const firstName = lookedUpCoach?.name.split(' ')[0] ?? 'Your coach';

  const handleContinue = () => {
    finishOnboarding();
    router.replace('/');
  };

  return (
    <View className="flex-1 items-center justify-center gap-6 px-6">
      <View className="h-20 w-20 items-center justify-center rounded-pill bg-violet">
        <Check color={tokens.inverse} size={36} />
      </View>

      <View className="items-center gap-2">
        <LIText
          size="h1"
          color="primary"
          text="You're all set"
          className="text-center font-geist-semibold text-foreground"
        />
        <LIText
          size="p"
          color="body"
          text={`${firstName} can now see what you shared. You can change this anytime from your profile.`}
          className="text-center font-geist"
        />
      </View>

      <LIButton
        title="Continue"
        onPress={handleContinue}
        fullWidth
        size="lg"
        shape="rounded"
        className="bg-violet active:bg-violet/90"
        testID="attached-continue"
      />
    </View>
  );
}
