import { View } from 'react-native';

import type { ApiStudent } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import { formatPercent } from '@/lib/format';

interface RosterStatsProps {
  readonly students: readonly ApiStudent[];
}

export default function RosterStats({ students }: RosterStatsProps) {
  const active = students.filter((student) => student.status !== 'inactive');
  const atRisk = students.filter((student) => student.status === 'at-risk');
  const averageAdherence =
    active.length === 0
      ? 0
      : active.reduce((total, student) => total + student.adherence, 0) / active.length;

  const stats = [
    { label: 'Active', value: String(active.length) },
    { label: 'At risk', value: String(atRisk.length) },
    { label: 'Avg adherence', value: formatPercent(averageAdherence) },
  ] as const;

  return (
    <View className="flex-row gap-3 px-4 pb-3">
      {stats.map((stat) => (
        <LICard key={stat.label} className="flex-1 gap-1 p-3">
          <LIText size="h3" color="primary" text={stat.value} />
          <LIText size="caption" color="muted" text={stat.label} numberOfLines={1} />
        </LICard>
      ))}
    </View>
  );
}
