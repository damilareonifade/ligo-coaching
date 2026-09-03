import { View } from 'react-native';

import type { ApiReviewSession } from '@/api/types';
import { LIBadge, LICard, LIText } from '@/components/ui';
import { sessionTagTone } from '@/lib/clientReview';
import { cn } from '@/lib/utils';

interface ReviewSessionsCardProps {
  readonly sessions: readonly ApiReviewSession[];
}

/** Rows only — a session's own detail is the client's screen, not the coach's. */
export default function ReviewSessionsCard({ sessions }: ReviewSessionsCardProps) {
  return (
    <LICard className="gap-1">
      <LIText
        size="h5"
        color="primary"
        text="Recent sessions"
        className="pb-2 font-geist-semibold"
      />

      {sessions.length === 0 ? (
        <LIText
          size="caption"
          color="muted"
          text="Nothing logged yet. Sessions appear here as they are finished."
          className="pb-1 font-geist"
        />
      ) : (
        sessions.map((session, index) => (
          <View
            key={session.id}
            className={cn(
              'flex-row items-center gap-3 py-3',
              index > 0 && 'border-t border-hairline',
            )}
            testID={`review-session-${session.id}`}
          >
            <View className="flex-1 gap-0.5">
              <LIText
                size="p"
                color="primary"
                text={session.name}
                className="font-geist-medium"
                numberOfLines={1}
              />
              <LIText
                size="caption"
                color="muted"
                text={session.meta}
                className="font-geist"
                numberOfLines={1}
              />
            </View>
            <LIBadge
              tone={sessionTagTone(session.tag)}
              label={session.tag}
              labelClassName="font-geist-medium"
            />
          </View>
        ))
      )}
    </LICard>
  );
}
