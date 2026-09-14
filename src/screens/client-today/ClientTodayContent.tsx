import { useCallback } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { useClientTodayQuery } from '@/api/clientTraining';
import { useUnreadNotificationsQuery } from '@/api/notifications';
import HomeHeader from '@/components/chrome/HomeHeader';
import { LIErrorState } from '@/components/ui';
import { useStartWorkout } from '@/hooks/useStartWorkout';
import { useThemeTokens } from '@/theme/tokens';

import ClientTodaySkeleton from './ClientTodaySkeleton';
import TodayCoachCard from './TodayCoachCard';
import TodayMacros from './TodayMacros';
import TodayPlanCard from './TodayPlanCard';
import TodayWeek from './TodayWeek';

/**
 * The client half of the Today tab. Every fetch for the screen happens here,
 * once; the sections below take data as props.
 *
 * The header sits outside the loading branch, like the coach's: the name and
 * the greeting are already in the auth store, so a client opening the app is
 * greeted on the first frame rather than shown a skeleton where their own name
 * should be. No subtitle — the plan card directly below already names the
 * session, and a header that repeats the card under it is noise.
 */
export default function ClientTodayContent() {
  const tokens = useThemeTokens();
  const { data, isPending, error, refetch, isRefetching } = useClientTodayQuery();
  const { start, pendingPlanId } = useStartWorkout();
  // Fetched here rather than inside the bell: every call in this app is made
  // by the screen and handed down. It is deliberately not awaited by anything
  // — a slow count must not hold up the plan card.
  const unread = useUnreadNotificationsQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <View className="flex-1">
      <HomeHeader unread={unread.data ?? false} />

      {isPending ? <ClientTodaySkeleton /> : null}

      {!isPending && (error || !data) ? (
        <LIErrorState message={error?.message} onRetry={refresh} />
      ) : null}

      {!isPending && data ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-4 pb-8 pt-2"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refresh}
              tintColor={tokens.violet}
            />
          }
        >
          <TodayPlanCard
            plan={data.plan}
            onStart={start}
            starting={data.plan !== null && pendingPlanId === data.plan.id}
          />
          {/* Only when the feature exists at all — the payload says so by
              carrying `null`, and src/lib/features.ts says why. */}
          {data.nutrition ? (
            <TodayMacros
              calories={data.nutrition.calories}
              protein={data.nutrition.protein}
            />
          ) : null}
          <TodayCoachCard coach={data.coach} />
          <TodayWeek week={data.week} />
        </ScrollView>
      ) : null}
    </View>
  );
}
