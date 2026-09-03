import { useCallback } from 'react';
import { View } from 'react-native';

import { useCoachProfileQuery } from '@/api/coachProfile';
import { LIErrorState, LISafeArea, LIText } from '@/components/ui';
import CoachSettingsContent from '@/screens/coach-settings/CoachSettingsContent';
import CoachSettingsSkeleton from '@/screens/coach-settings/CoachSettingsSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * The coach's settings. Coach-only by routing: `(tabs)/_layout.tsx` gives this
 * tab `href: null` for a client, who has their own Profile tab instead. The
 * two are not the same screen with different rows — a client's account is
 * about what they share, a coach's is about how they work — so neither role
 * sees the other's, and nothing here has a client branch.
 */
export default function CoachSettingsScreen() {
  const { data, isPending, error, refetch, isRefetching } = useCoachProfileQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <LISafeArea>
      <View className="px-4 pt-2">
        <LIText size="h2" color="primary" text="Settings" className="font-geist-bold" />
      </View>

      {isPending ? <CoachSettingsSkeleton /> : null}

      {!isPending && (error || !data) ? (
        <LIErrorState message={error?.message} onRetry={refresh} />
      ) : null}

      {!isPending && data ? (
        <CoachSettingsContent profile={data} refreshing={isRefetching} onRefresh={refresh} />
      ) : null}
    </LISafeArea>
  );
}
