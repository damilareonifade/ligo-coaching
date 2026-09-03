import { View } from 'react-native';

import type { ApiVolumePoint } from '@/api/types';
import { LIChart } from '@/components/LIChart';
import { LICard, LISkeleton, LIText } from '@/components/ui';

interface StudentProgressChartProps {
  readonly points: readonly ApiVolumePoint[];
  readonly loading: boolean;
}

export default function StudentProgressChart({ points, loading }: StudentProgressChartProps) {
  if (loading) {
    return (
      <LICard className="gap-3">
        <LISkeleton className="h-4 w-36" />
        <LISkeleton className="h-40 w-full" />
      </LICard>
    );
  }

  if (points.length === 0) {
    return (
      <LICard className="gap-1">
        <LIText size="h5" color="primary" text="Weekly volume" />
        <LIText size="p" color="muted" text="No sessions logged yet — the chart fills in from week one." />
      </LICard>
    );
  }

  const data = points.map((point) => ({
    label: new Date(point.weekStart).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    value: point.volumeKg,
  }));

  // Only every other tick fits across a phone; the bars still show all weeks.
  const sparseLabels = data.map((datum, index) => ({
    ...datum,
    label: index % 2 === 0 ? datum.label : ' ',
  }));

  return (
    <LICard className="gap-2">
      <View className="gap-0.5">
        <LIText size="h5" color="primary" text="Weekly volume" />
        <LIText size="caption" color="muted" text="Total load lifted per week (kg)" />
      </View>
      <LIChart data={sparseLabels} tone="violet" />
    </LICard>
  );
}
