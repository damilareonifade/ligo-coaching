import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import type { ApiClientCoachSummary } from '@/api/types';
import { LIAvatar, LIBadge, LIButton, LICard, LIText } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

interface TodayCoachCardProps {
  readonly coach: ApiClientCoachSummary | null;
}

/** Training alone is the default, not a failure state — so is the empty card. */
export default function TodayCoachCard({ coach }: TodayCoachCardProps) {
  const tokens = useThemeTokens();
  const router = useRouter();

  if (!coach) {
    return (
      <LICard className="gap-3">
        <LIText size="caption" color="muted" text="Coach" className="font-geist-medium" />
        <LIText size="caption" color="muted" text="No coach attached" className="font-geist" />
        <LIButton
          title="Add a coach"
          variant="outline"
          fullWidth
          onPress={() => router.push('/onboarding/attach-coach?direct=1')}
          testID="today-add-coach"
        />
      </LICard>
    );
  }

  return (
    <LICard className="gap-3">
      <View className="flex-row items-center justify-between">
        <LIText size="caption" color="muted" text="Coach" className="font-geist-medium" />
        <LIBadge tone="violet" label={coach.permissionLabel} labelClassName="font-geist-medium" />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Message ${coach.line1}`}
        onPress={() => router.push('/coach/chat')}
        className="flex-row items-center gap-3 active:opacity-80"
        testID="today-coach-row"
      >
        <LIAvatar name={coach.name} size="md" labelClassName="font-geist-semibold" />
        <View className="flex-1 gap-0.5">
          <LIText size="h5" color="primary" text={coach.line1} className="font-geist-semibold" />
          <LIText size="caption" color="muted" text={coach.line2} className="font-geist" />
        </View>
        <ChevronRight color={tokens['foreground-subtle']} size={20} />
      </Pressable>
    </LICard>
  );
}
