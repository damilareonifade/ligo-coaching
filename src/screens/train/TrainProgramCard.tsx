import { View } from 'react-native';

import type { ApiProgramProgress } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';

interface TrainProgramCardProps {
  readonly program: ApiProgramProgress;
}

export default function TrainProgramCard({ program }: TrainProgramCardProps) {
  const weeks = Array.from({ length: program.totalWeeks }, (_, index) => index + 1);

  return (
    <LICard className="gap-3">
      <View className="flex-row items-center justify-between">
        <LIText size="h5" color="primary" text={program.title} className="font-geist-semibold" />
        <LIText size="caption" color="muted" text={program.week} className="font-geist-medium" />
      </View>

      <View
        className="flex-row items-center gap-1.5"
        accessibilityRole="progressbar"
        accessibilityLabel={`${program.title}, ${program.week}`}
        accessibilityValue={{ min: 0, max: program.totalWeeks, now: program.currentWeek }}
      >
        {weeks.map((week) => (
          <View
            key={week}
            className={cn(
              'h-2 w-2 rounded-pill',
              week <= program.currentWeek ? 'bg-violet' : 'bg-field',
            )}
          />
        ))}
      </View>

      <LIText size="caption" color="muted" text={program.note} className="font-geist" />
    </LICard>
  );
}
