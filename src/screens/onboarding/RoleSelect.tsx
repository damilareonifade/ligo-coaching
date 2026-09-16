import { Check, Dumbbell, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import type { UserRole } from '@/api/types';
import { LIButton, LICard, LIText } from '@/components/ui';
import { useGoogleSignUp } from '@/hooks/useGoogleSignUp';
import { cn } from '@/lib/utils';
import SocialSignIn from '@/components/auth/SocialSignIn';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useThemeTokens } from '@/theme/tokens';

interface RoleCardConfig {
  readonly role: UserRole;
  readonly title: string;
  readonly body: string;
  readonly icon: typeof User;
  readonly testID: string;
}

const cards: readonly RoleCardConfig[] = [
  {
    role: 'client',
    title: 'Train on my own',
    body: 'Log workouts and food yourself. Add a coach later if you want one.',
    icon: User,
    testID: 'role-client',
  },
  {
    role: 'coach',
    title: 'Coach others',
    body: 'Build programs, track a roster, and guide clients from your phone.',
    icon: Dumbbell,
    testID: 'role-coach',
  },
];

export default function RoleSelect() {
  const tokens = useThemeTokens();
  const router = useRouter();
  const role = useOnboardingStore((state) => state.role);
  const setRole = useOnboardingStore((state) => state.setRole);
  const google = useGoogleSignUp();

  const handleContinue = useCallback(() => {
    router.push('/signup/details');
  }, [router]);

  return (
    <View className="flex-1 justify-center gap-6 px-6">
      <View className="gap-2">
        <LIText
          size="h1"
          color="primary"
          text="Create an account"
          className="font-geist-semibold text-foreground"
        />
        <LIText
          size="p"
          color="body"
          text="Pick how you will use SetTrack. Adding coaching later needs no second account."
          className="font-geist"
        />
      </View>

      <View className="gap-3">
        {cards.map((card) => {
          const selected = role === card.role;
          const Icon = card.icon;
          return (
            <LICard
              key={card.role}
              onPress={() => setRole(card.role)}
              testID={card.testID}
              className={cn(
                'gap-2 border-2 bg-surface',
                selected ? 'border-violet-line' : 'border-transparent',
              )}
            >
              <View className="flex-row items-center justify-between">
                <View className="h-10 w-10 items-center justify-center rounded-pill bg-violet-weak">
                  <Icon color={tokens.violet} size={20} />
                </View>
                {selected ? (
                  <View className="h-6 w-6 items-center justify-center rounded-pill bg-violet">
                    <Check color={tokens.inverse} size={14} />
                  </View>
                ) : null}
              </View>
              <LIText
                size="h4"
                color="primary"
                text={card.title}
                className="font-geist-medium text-foreground"
              />
              <LIText size="p" color="body" text={card.body} className="font-geist" />
            </LICard>
          );
        })}
      </View>

      <LIButton
        title="Continue"
        onPress={handleContinue}
        disabled={role === null}
        fullWidth
        size="lg"
        shape="rounded"
        className="bg-violet active:bg-violet/90"
        testID="role-continue"
      />

      <SocialSignIn
        onGoogle={() => void (role !== null && google.start(role))}
        // Disabled until a role is picked: the account is created with one, so
        // there is nothing sensible to do with this button before then.
        busy={google.pending || role === null}
        label="Or create your account with"
      />

      <LIText
        size="caption"
        color="muted"
        text="Already have an account?"
        link
        linkValue="Sign in"
        linkHref="/login"
        linkColor={tokens.violet}
        className="text-center font-geist"
      />
    </View>
  );
}
