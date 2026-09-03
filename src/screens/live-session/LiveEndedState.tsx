import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { LIEmptyState } from '@/components/ui';

interface LiveEndedStateProps {
  readonly clientId: string;
}

/**
 * What the live screen shows when there is nothing live.
 *
 * A coach reaches this two ways: they followed the banner a minute too late,
 * or they came back to a tab left open since this morning. Neither is an
 * error, and neither should be a spinner that never resolves or a stale
 * session left on screen as though the client were still lifting. The session
 * ended; the review is where the rest of it is.
 */
export default function LiveEndedState({ clientId }: LiveEndedStateProps) {
  const router = useRouter();

  const openReview = useCallback(
    () => router.replace(`/student/${clientId}`),
    [clientId, router],
  );

  return (
    <View className="flex-1 justify-center" testID="live-ended">
      <LIEmptyState
        title="The session ended"
        message="Nothing is being logged right now. The finished sets are on the review."
        actionTitle="Full review"
        onAction={openReview}
      />
    </View>
  );
}
