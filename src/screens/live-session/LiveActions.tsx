import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { LIButton } from '@/components/ui';
import { firstName } from '@/lib/liveSession';

interface LiveActionsProps {
  readonly clientId: string;
  readonly clientName: string;
}

/**
 * The two ways out, and neither of them touches the session.
 *
 * A coach watching a set go badly wants to say something — so the thread is
 * the first button, not a detail buried behind the review. Both are `outline`
 * rather than one primary: nothing on this screen is the thing the coach is
 * supposed to do next. They are watching.
 */
export default function LiveActions({ clientId, clientName }: LiveActionsProps) {
  const router = useRouter();

  const openThread = useCallback(
    () => router.push(`/messages/${clientId}`),
    [clientId, router],
  );
  const openReview = useCallback(
    () => router.push(`/student/${clientId}`),
    [clientId, router],
  );

  return (
    <View className="gap-2 pt-1">
      <LIButton
        title={`Message ${firstName(clientName)}`}
        variant="outline"
        fullWidth
        shape="rounded"
        onPress={openThread}
        testID="live-message"
      />
      <LIButton
        title="Full review"
        variant="outline"
        fullWidth
        shape="rounded"
        onPress={openReview}
        testID="live-review"
      />
    </View>
  );
}
