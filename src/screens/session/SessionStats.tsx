import { View } from 'react-native';

import { LICard, LIText } from '@/components/ui';
import { useElapsedMs } from '@/hooks/useElapsedMs';
import { formatElapsed, formatVolumeKg } from '@/lib/format';

interface StatCardProps {
  readonly label: string;
  readonly value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <LICard className="flex-1 gap-1">
      <LIText
        size="caption"
        color="muted"
        text={label}
        className="font-geist-medium uppercase tracking-wide"
      />
      <LIText size="h3" color="primary" text={value} className="font-geist-semibold" />
    </LICard>
  );
}

interface SessionStatsProps {
  readonly startedAtMs: number | null;
  readonly volumeKg: number;
}

export default function SessionStats({ startedAtMs, volumeKg }: SessionStatsProps) {
  const elapsedMs = useElapsedMs(startedAtMs);

  return (
    <View className="flex-row gap-3">
      <StatCard label="Elapsed" value={formatElapsed(elapsedMs)} />
      <StatCard label="Volume" value={formatVolumeKg(volumeKg)} />
    </View>
  );
}
