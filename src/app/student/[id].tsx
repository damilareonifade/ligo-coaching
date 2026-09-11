import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useClientReviewQuery } from '@/api/coachClient';
import { useRosterQuery } from '@/api/roster';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ReviewContent from '@/screens/client-review/ReviewContent';
import ReviewSkeleton from '@/screens/client-review/ReviewSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * The coach's review of one client. Still `/student/<id>` so the roster rows
 * and the activity feed keep resolving; what is behind the route is new.
 *
 * Composer only: both fetches happen here. The roster comes along for its
 * labels, which the review's picker needs and which are already cached from
 * the screen the coach almost certainly arrived from.
 */
export default function ClientReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = id ?? '';

  const reviewQuery = useClientReviewQuery(clientId);
  const rosterQuery = useRosterQuery();

  const refresh = useCallback(() => {
    void reviewQuery.refetch();
    void rosterQuery.refetch();
  }, [reviewQuery, rosterQuery]);

  if (reviewQuery.isPending) {
    return (
      <LISafeArea edges={[]}>
        <ReviewSkeleton />
      </LISafeArea>
    );
  }

  if (reviewQuery.error || !reviewQuery.data) {
    return (
      <LISafeArea edges={[]}>
        <LIErrorState message={reviewQuery.error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea edges={[]}>
      <ReviewContent
        review={reviewQuery.data}
        labels={rosterQuery.data?.labels ?? []}
        refreshing={reviewQuery.isRefetching}
        onRefresh={refresh}
      />
    </LISafeArea>
  );
}
