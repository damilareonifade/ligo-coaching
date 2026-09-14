import { useRouter } from 'expo-router';
import { View } from 'react-native';

import type { ApiClientPlan } from '@/api/types';
import { LIButton, LICard, LIText } from '@/components/ui';

interface TodayPlanCardProps {
  /** `null` when there is nothing to suggest — see `ApiClientToday.plan`. */
  readonly plan: ApiClientPlan | null;
  readonly onStart: (planId: string) => void;
  readonly starting: boolean;
}

/**
 * Nothing planned is not an error and not an empty rectangle.
 *
 * Every client starts here — before a coach assigns anything and before they
 * build a routine of their own — so it is the first thing many people will
 * see of the app, and it offers the way out rather than describing the hole.
 */
function NothingPlanned() {
  const router = useRouter();

  return (
    <LICard className="gap-3 bg-violet-weak" testID="today-no-plan">
      <LIText size="caption" color="body" text="Today's plan" className="font-geist-medium" />
      <View className="gap-1">
        <LIText
          size="h3"
          color="primary"
          text="Nothing planned yet"
          className="font-geist-semibold"
        />
        <LIText
          size="caption"
          color="muted"
          text="Build a routine of your own, or attach a coach and follow theirs."
          className="font-geist"
        />
      </View>
      <LIButton
        title="Build a routine"
        onPress={() => router.push('/routines/new')}
        fullWidth
        testID="today-build-routine"
      />
    </LICard>
  );
}

/** The one thing this screen exists for: today's session, one tap away. */
export default function TodayPlanCard({ plan, onStart, starting }: TodayPlanCardProps) {
  if (!plan) return <NothingPlanned />;

  return (
    <LICard className="gap-3 bg-violet-weak">
      <View className="flex-row items-center justify-between">
        <LIText size="caption" color="body" text="Today's plan" className="font-geist-medium" />
        <LIText size="caption" color="muted" text={plan.source} className="font-geist" />
      </View>

      <View className="gap-1">
        <LIText size="h3" color="primary" text={plan.title} className="font-geist-semibold" />
        <LIText size="caption" color="muted" text={plan.meta} className="font-geist" />
      </View>

      <LIButton
        title="Start workout"
        onPress={() => onStart(plan.id)}
        loading={starting}
        fullWidth
        testID="today-start-workout"
      />
    </LICard>
  );
}
