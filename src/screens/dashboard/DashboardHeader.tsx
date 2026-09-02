import { View } from 'react-native';

import type { ApiCoach } from '@/api/types';
import { LIAvatar, LIText } from '@/components/ui';

interface DashboardHeaderProps {
  readonly coach: ApiCoach | null;
  readonly sessionCount: number;
}

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardHeader({ coach, sessionCount }: DashboardHeaderProps) {
  const name = coach?.name ?? 'Coach';
  const subtitle =
    sessionCount === 0
      ? 'No sessions on the board today.'
      : `${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'} on the board today.`;

  return (
    <View className="flex-row items-center justify-between px-4 pb-4 pt-2">
      <View className="flex-1 gap-1">
        <LIText size="caption" color="muted" text={`${greeting(new Date().getHours())},`} />
        <LIText size="h2" color="primary" text={name} numberOfLines={1} />
        <LIText size="p" color="body" text={subtitle} />
      </View>
      <LIAvatar name={name} uri={coach?.avatarUrl} size="lg" />
    </View>
  );
}
