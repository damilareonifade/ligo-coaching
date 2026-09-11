import { View } from 'react-native';

import type { ApiClientDay } from '@/api/types';
import { LIBadge, LICard, LIText, type LIBadgeProps } from '@/components/ui';

/** Tag → badge tone. Anything unrecognised reads as neutral, never as an error. */
function toneForTag(tag: string): NonNullable<LIBadgeProps['tone']> {
  switch (tag) {
    case 'Today':
      return 'violet';
    case 'Done':
      return 'success';
    case 'Missed':
      return 'danger';
    default:
      return 'neutral';
  }
}

interface TodayWeekProps {
  readonly week: readonly ApiClientDay[];
}

export default function TodayWeek({ week }: TodayWeekProps) {
  return (
    <View className="gap-2">
      <LIText
        size="caption"
        color="muted"
        text="This week"
        className="font-geist-medium uppercase tracking-wide"
      />

      {week.length === 0 ? (
        <LICard>
          <LIText
            size="caption"
            color="muted"
            text="Nothing planned this week yet."
            className="font-geist"
          />
        </LICard>
      ) : (
        <LICard className="gap-3">
          {week.map((day) => (
            <View key={day.day} className="flex-row items-center gap-3">
              <LIText
                size="caption"
                color="muted"
                text={day.day}
                className="w-10 font-geist-medium"
              />
              <View className="flex-1 gap-0.5">
                <LIText size="h5" color="primary" text={day.title} className="font-geist-medium" />
                <LIText size="caption" color="muted" text={day.meta} className="font-geist" />
              </View>
              <LIBadge
                tone={toneForTag(day.tag)}
                label={day.tag}
                labelClassName="font-geist-medium"
              />
            </View>
          ))}
        </LICard>
      )}
    </View>
  );
}
