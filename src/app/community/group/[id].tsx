import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useGroupQuery } from '@/api/community';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import { groupScreenTitle } from '@/lib/community';
import GroupContent from '@/screens/community-group/GroupContent';
import GroupSkeleton from '@/screens/community-group/GroupSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only — the header owns the top inset, so only the bottom edge here.
 *
 * The title is the one navigation option in this feature set here rather than
 * in `_layout.tsx`: it is the group's own name, which the layout cannot know
 * before the fetch. The static fallback is registered there, and this narrows
 * it once the name arrives.
 */
export default function CommunityGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch } = useGroupQuery(id);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={['bottom']}>
        <ScreenHeader
          title="Group"
          eyebrow="Community"
          backLabel="Community"
        />
        <GroupSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea edges={['bottom']}>
        <ScreenHeader
          title="Group"
          eyebrow="Community"
          backLabel="Community"
        />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea edges={['bottom']}>
      <ScreenHeader
        title="Group"
        eyebrow="Community"
        backLabel="Community"
      />
      <Stack.Screen options={{ title: groupScreenTitle(data.name) }} />
      <GroupContent group={data} />
    </LISafeArea>
  );
}
