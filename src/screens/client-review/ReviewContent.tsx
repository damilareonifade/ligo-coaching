import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { errorMessage } from '@/api/client';
import {
  useClientRoutinesQuery,
  useRequestAccessMutation,
  useSetClientLabelMutation,
} from '@/api/coachClient';
import type { ApiClientReview, ApiReviewDomain, ApiRosterLabel } from '@/api/types';
import { useUiStore } from '@/store/uiStore';
import { tokens } from '@/theme/tokens';

import ReviewDomainCard from './ReviewDomainCard';
import ReviewHeaderCard from './ReviewHeaderCard';
import ReviewLabelCard from './ReviewLabelCard';
import ReviewLiveBanner from './ReviewLiveBanner';
import ReviewRoutinesCard from './ReviewRoutinesCard';
import ReviewSessionsCard from './ReviewSessionsCard';
import ReviewWorkoutsCard from './ReviewWorkoutsCard';

interface ReviewContentProps {
  readonly review: ApiClientReview;
  readonly labels: readonly ApiRosterLabel[];
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

/**
 * Everything the coach may see about one client, in the order they ask for it:
 * who and how to reach them, what they are training now, the coach's own
 * filing, the one domain that needs no permission, then the four that do, then
 * the log.
 *
 * The domain cards come after workouts and before sessions on purpose. A
 * coach scrolling this screen passes through the permission boundary in the
 * middle of it — everything above is theirs by virtue of coaching, everything
 * in the block is the client's to give — rather than meeting a single "locked"
 * section tacked on at the end.
 *
 * Both writes live here rather than in the cards below, so the cards stay pure
 * display and there is one place that knows what a failed request looks like.
 */
export default function ReviewContent({
  review,
  labels,
  refreshing,
  onRefresh,
}: ReviewContentProps) {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const setLabel = useSetClientLabelMutation();
  const requestAccess = useRequestAccessMutation();
  const routinesQuery = useClientRoutinesQuery(review.clientId);
  const [pendingDomain, setPendingDomain] = useState<ApiReviewDomain['id'] | null>(null);

  const handleSelectLabel = useCallback(
    (labelId: string | null) => {
      setLabel.mutate(
        { clientId: review.clientId, labelId },
        { onError: (error) => showToast(errorMessage(error), 'danger') },
      );
    },
    [review.clientId, setLabel, showToast],
  );

  const openCheckIns = useCallback(
    () => router.push({ pathname: '/check-ins', params: { clientId: review.clientId } }),
    [review.clientId, router],
  );

  const handleRequest = useCallback(
    (domainId: ApiReviewDomain['id']) => {
      setPendingDomain(domainId);
      requestAccess.mutate(
        { clientId: review.clientId, domainId },
        {
          onSuccess: () => showToast('Asked. It is theirs to answer.', 'success'),
          onError: (error) => showToast(errorMessage(error), 'danger'),
          onSettled: () => setPendingDomain(null),
        },
      );
    },
    [requestAccess, review.clientId, showToast],
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-3 px-4 pb-10 pt-2"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
      }
      testID="review-scroll"
    >
      <ReviewHeaderCard review={review} />

      {review.isTraining ? (
        <ReviewLiveBanner clientId={review.clientId} name={review.name} />
      ) : null}

      <ReviewLabelCard
        name={review.name}
        labels={labels}
        labelId={review.labelId}
        onSelect={handleSelectLabel}
      />

      <ReviewWorkoutsCard adherence={review.adherence} bars={review.adherenceBars} />
      <ReviewRoutinesCard
        clientId={review.clientId}
        routines={routinesQuery.data?.routines ?? []}
        week={routinesQuery.data?.week ?? { done: 0, target: 0 }}
        loading={routinesQuery.isPending}
      />

      {/* Straight after the routines, because the two are one thought: what
          they are meant to be doing, then what they actually did. The domain
          cards below are about access — a different question, and one a coach
          asks less often than "how did last week go". */}
      <ReviewSessionsCard sessions={review.sessions} />

      {review.domains.map((domain) => (
        <ReviewDomainCard
          key={domain.id}
          domain={domain}
          onRequest={handleRequest}
          requesting={pendingDomain === domain.id}
          // Check-ins are the one domain a coach can write to, and only where
          // the client turned on logging for them. Everything else here is a
          // read, so nothing else gets a way in.
          action={
            domain.id === 'monthly' && review.canLogFor
              ? { title: 'Open check-ins', onPress: openCheckIns }
              : null
          }
        />
      ))}
    </ScrollView>
  );
}
