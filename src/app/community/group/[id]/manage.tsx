import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useGroupQuery } from '@/api/community';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import { LIErrorState, LISafeArea } from '@/components/ui';
import GroupSkeleton from '@/screens/community-group/GroupSkeleton';
import ManageContent from '@/screens/community-manage/ManageContent';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the group it manages is the same query the thread reads. */
export default function GroupManageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch } = useGroupQuery(id ?? '');

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <LISafeArea edges={['top', 'bottom']}>
      <ScreenHeader
        title={data?.name ?? 'Group'}
        eyebrow="Members and rankings"
        backLabel="Group"
      />

      {isPending ? <GroupSkeleton /> : null}
      {!isPending && (error || !data) ? (
        <LIErrorState message={error?.message} onRetry={refresh} />
      ) : null}
      {!isPending && data ? <ManageContent group={data} /> : null}
    </LISafeArea>
  );
}
