import { useRouter } from 'expo-router';
import { Check, Target } from 'lucide-react-native';
import { View } from 'react-native';

import { LIButton, LIText } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

interface BulletConfig {
  readonly title: string;
  readonly body: string;
}

const bullets: readonly BulletConfig[] = [
  {
    title: 'Log everything yourself',
    body: 'Workouts, food, and progress — track it all without waiting on anyone.',
  },
  {
    title: 'Add a coach anytime',
    body: 'Attach one later in seconds. Remove them just as easily.',
  },
  {
    title: 'Your data stays yours',
    body: 'Nothing is shared until you choose to share it.',
  },
];

export default function OnboardingWelcome() {
  const tokens = useThemeTokens();
  const router = useRouter();

  return (
    <View className="flex-1 justify-center gap-6 px-6">
      <View className="items-center gap-4">
        <View className="h-16 w-16 items-center justify-center rounded-pill bg-violet-weak">
          <Target color={tokens.violet} size={28} />
        </View>
        <View className="items-center gap-2">
          <LIText
            size="h1"
            color="primary"
            text="Your training. Your data."
            className="text-center font-geist-semibold text-foreground"
          />
          <LIText
            size="p"
            color="body"
            text="Track workouts and food on your own. Add a coach later if you want one — and remove them whenever you like."
            className="text-center font-geist"
          />
        </View>
      </View>

      <View className="gap-4">
        {bullets.map((bullet) => (
          <View key={bullet.title} className="flex-row gap-3">
            <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-pill bg-violet">
              <Check color={tokens.inverse} size={14} />
            </View>
            <View className="flex-1 gap-0.5">
              <LIText
                size="h5"
                color="primary"
                text={bullet.title}
                className="font-geist-medium text-foreground"
              />
              <LIText size="p" color="body" text={bullet.body} className="font-geist" />
            </View>
          </View>
        ))}
      </View>

      <View className="gap-3">
        <LIButton
          title="Set up my profile"
          onPress={() => router.push('/onboarding/goals')}
          fullWidth
          size="lg"
          shape="rounded"
          className="bg-violet active:bg-violet/90"
          testID="welcome-setup-profile"
        />
        <LIButton
          title="I have a coach invite"
          // Not `direct=1`: that flag means "opened from the profile by
          // someone already onboarded", where declining should pop back. From
          // here declining has to finish onboarding, or this button is a loop
          // with the goals branch as its only exit.
          onPress={() => router.push('/onboarding/attach-coach')}
          variant="outline"
          fullWidth
          size="lg"
          shape="rounded"
          className="border-violet"
          labelClassName="text-violet"
          testID="welcome-have-invite"
        />
      </View>

      <LIText
        size="caption"
        color="muted"
        text="No coach required. Ever."
        className="text-center font-geist"
      />
    </View>
  );
}
