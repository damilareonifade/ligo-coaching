import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { LIAvatar, LIBadge, LICard, LIText } from '@/components/ui';

interface ChatHeaderCardProps {
  readonly coachName: string;
  readonly context: string;
  readonly chipLabel: string;
}

/**
 * The permission chip is the target, not decoration: the question a client asks
 * mid-thread is "what can he actually see?", and the answer is one tap away.
 */
export default function ChatHeaderCard({ coachName, context, chipLabel }: ChatHeaderCardProps) {
  const router = useRouter();

  const openPermissions = useCallback(
    () => router.push('/onboarding/coach-permissions'),
    [router],
  );

  return (
    <LICard className="flex-row items-center gap-3">
      <LIAvatar name={coachName} size="md" labelClassName="font-geist-semibold" />

      <View className="flex-1 gap-0.5">
        <LIText size="h5" color="primary" text={coachName} className="font-geist-semibold" />
        <LIText size="caption" color="muted" text={context} className="font-geist" />
      </View>

      <LIBadge
        tone="violet"
        label={chipLabel}
        labelClassName="font-geist-medium"
        onPress={openPermissions}
        testID="chat-permissions-chip"
      />
    </LICard>
  );
}
