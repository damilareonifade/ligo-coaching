import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import type { ApiClientReview } from '@/api/types';
import { LIAvatar, LIButton, LICard, LIText } from '@/components/ui';

interface ReviewHeaderCardProps {
  readonly review: ApiClientReview;
}

/**
 * Who this is, what they are on, and the one thing a coach can always do.
 *
 * Message is the only action up here because it is the only one that never
 * depends on a permission. Everything else on this screen is conditional on
 * what the client shared; a thread is not, so it sits above all of it.
 */
export default function ReviewHeaderCard({ review }: ReviewHeaderCardProps) {
  const router = useRouter();

  const openThread = useCallback(
    () => router.push(`/messages/${review.clientId}`),
    [review.clientId, router],
  );

  return (
    <LICard className="gap-4">
      <View className="flex-row items-center gap-3">
        <LIAvatar name={review.name} size="lg" labelClassName="font-geist-semibold" />
        <View className="flex-1 gap-0.5">
          <LIText
            size="h3"
            color="primary"
            text={review.name}
            numberOfLines={1}
            className="font-geist-semibold"
          />
          <LIText
            size="caption"
            color="muted"
            text={review.programLine}
            className="font-geist"
            numberOfLines={1}
          />
        </View>
      </View>

      <LIButton
        title="Message"
        variant="outline"
        fullWidth
        shape="rounded"
        onPress={openThread}
        testID="review-message"
      />
    </LICard>
  );
}
