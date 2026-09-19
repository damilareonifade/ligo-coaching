import { useCallback } from 'react';

import { View } from 'react-native';

import { useCoachHomeQuery } from '@/api/coachHome';
import { useUnreadNotificationsQuery } from '@/api/notifications';
import { queryKeys } from '@/api/queryKeys';
import HomeHeader from '@/components/chrome/HomeHeader';
import { LIErrorState } from '@/components/ui';
import { useLiveRows } from '@/hooks/useLiveRows';
import { coachHomeSubtitle } from '@/lib/coachHome';

import CoachHomeContent from './CoachHomeContent';
import CoachHomeSkeleton from './CoachHomeSkeleton';

/**
 * The coach half of the home tab: every fetch for the screen happens here.
 *
 * The header sits outside the loading branch on purpose — the name and photo
 * are already in the auth store, so a coach opening the app sees who they are
 * immediately rather than a skeleton where their own name should be.
 */
export default function CoachHome() {
  const { data, isPending, error, refetch, isRefetching } = useCoachHomeQuery();
  // Fetched here rather than inside the bell — see the note in
  // ClientTodayContent. A slow count must not hold up who is on the floor.
  const unread = useUnreadNotificationsQuery();

  // The dot has no other way to learn. `unread_notification_count` is asked
  // once when this mounts and the app's default `staleTime` is a minute, so a
  // notification written while somebody sat here changed nothing they could
  // see — which is how a group invitation arrived correctly and was still
  // found only by opening the bell on a hunch. No filter: RLS
  // (`notifications_select_own`) already delivers only this person's.
  useLiveRows({
    key: 'notifications',
    table: 'notifications',
    // The prefix, so the feed and the dot under it both go stale.
    invalidate: [queryKeys.notifications('coach')],
  });

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <View className="flex-1">
      <HomeHeader
        subtitle={data ? coachHomeSubtitle(data) : null}
        unread={unread.data ?? false}
      />

      {isPending ? <CoachHomeSkeleton /> : null}

      {!isPending && (error || !data) ? (
        <LIErrorState message={error?.message} onRetry={refresh} />
      ) : null}

      {!isPending && data ? (
        <CoachHomeContent home={data} refreshing={isRefetching} onRefresh={refresh} />
      ) : null}
    </View>
  );
}
