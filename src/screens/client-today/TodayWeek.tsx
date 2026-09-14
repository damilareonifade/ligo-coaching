import { View } from 'react-native';

import type { ApiWeeklyProgress } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';

interface TodayWeekProps {
  readonly week: ApiWeeklyProgress;
}

/**
 * How much training has happened this week, against the target.
 *
 * It reports; it does not predict. This used to be a Mon–Fri strip tagging
 * days "Planned" and "Missed", which claimed a calendar the app does not have:
 * a program is a rotation the client works through at their own pace, so no
 * routine is due on any day and none can be late. Counting what was done is
 * the only honest thing to say.
 */
export default function TodayWeek({ week }: TodayWeekProps) {
  const marks = Array.from({ length: Math.max(week.target, week.done) }, (_, index) => index);
  const met = week.done >= week.target;

  return (
    <View className="gap-2">
      <LIText
        size="caption"
        color="muted"
        text="This week"
        className="font-geist-medium uppercase tracking-wide"
      />

      <LICard className="gap-3">
        <View className="flex-row items-baseline gap-2">
          <LIText
            size="h3"
            color="primary"
            text={`${week.done} of ${week.target}`}
            className="font-geist-semibold"
          />
          <LIText
            size="caption"
            color="muted"
            text={week.target === 1 ? 'session' : 'sessions'}
            className="font-geist"
          />
        </View>

        <View
          className="flex-row items-center gap-1.5"
          accessibilityRole="progressbar"
          accessibilityLabel={`${week.done} of ${week.target} sessions this week`}
          accessibilityValue={{ min: 0, max: week.target, now: week.done }}
        >
          {marks.map((index) => (
            <View
              key={index}
              className={cn(
                'h-2 flex-1 rounded-pill',
                index < week.done ? (met ? 'bg-success' : 'bg-violet') : 'bg-field',
              )}
            />
          ))}
        </View>

        <LIText
          size="caption"
          color="muted"
          text={
            met
              ? 'Target met. Anything more is a bonus.'
              : 'Train on whichever days suit you — nothing is scheduled.'
          }
          className="font-geist"
        />
      </LICard>
    </View>
  );
}
