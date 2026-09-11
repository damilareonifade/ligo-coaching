import { View } from 'react-native';

import type { ApiCheckInStat } from '@/api/types';
import { LICard, LIText } from '@/components/ui';

interface CheckInStatsProps {
  readonly stats: readonly ApiCheckInStat[];
}

export default function CheckInStats({ stats }: CheckInStatsProps) {
  return (
    <View className="flex-row gap-3">
      {stats.map((stat) => (
        <LICard key={stat.label} className="flex-1 items-center gap-1 px-2 py-3">
          <LIText size="h4" color="primary" text={stat.value} className="font-geist-semibold" />
          <LIText
            size="caption"
            color="muted"
            text={stat.label}
            numberOfLines={1}
            className="font-geist"
          />
        </LICard>
      ))}
    </View>
  );
}
