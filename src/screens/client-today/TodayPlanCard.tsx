import { View } from 'react-native';

import type { ApiClientPlan } from '@/api/types';
import { LIButton, LICard, LIText } from '@/components/ui';

interface TodayPlanCardProps {
  readonly plan: ApiClientPlan;
  readonly onStart: (planId: string) => void;
  readonly starting: boolean;
}

/** The one thing this screen exists for: today's session, one tap away. */
export default function TodayPlanCard({ plan, onStart, starting }: TodayPlanCardProps) {
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
