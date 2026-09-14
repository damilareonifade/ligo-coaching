import { View } from 'react-native';

import type { ApiVolumeBar } from '@/api/types';
import { LIChart } from '@/components/LIChart';
import { LICard, LIText } from '@/components/ui';
import { useUnits } from '@/hooks/useUnits';

interface ProgressVolumeCardProps {
  readonly weeklyVolumeKg: number;
  readonly changePct: number;
  readonly bars: readonly ApiVolumeBar[];
}

export default function ProgressVolumeCard({
  weeklyVolumeKg,
  changePct,
  bars,
}: ProgressVolumeCardProps) {
  const units = useUnits();
  const rising = changePct >= 0;
  const data = bars.map((bar) => ({ label: bar.label, value: bar.volumeKg }));

  return (
    <LICard className="gap-3">
      <View className="flex-row items-start justify-between">
        <View className="gap-0.5">
          <LIText
            size="caption"
            color="muted"
            text="Weekly volume"
            className="font-geist-medium"
          />
          <LIText
            size="h2"
            color="primary"
            text={units.formatVolume(weeklyVolumeKg)}
            className="font-geist-semibold"
          />
        </View>
        <LIText
          size="p"
          color={rising ? 'success' : 'danger'}
          text={`${rising ? '+' : ''}${changePct.toFixed(1)}%`}
          className="font-geist-semibold"
        />
      </View>

      {data.length === 0 ? (
        <LIText
          size="caption"
          color="muted"
          text="No sessions logged yet — the chart fills in from week one."
          className="font-geist"
        />
      ) : (
        <LIChart data={data} tone="violet" height={140} />
      )}
    </LICard>
  );
}
