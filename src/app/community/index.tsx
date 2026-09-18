import { useCallback, useState } from 'react';

import { useCommunityQuery } from '@/api/community';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import CommunityCreateSheet from '@/components/community/CommunityCreateSheet';
import CommunityContent from '@/screens/community/CommunityContent';
import CommunitySkeleton from '@/screens/community/CommunitySkeleton';
import CommunityNewButton from '@/components/community/CommunityNewButton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only: every fetch for this screen happens here, once. */
export default function CommunityScreen() {
  const { data, isPending, error, refetch, isRefetching } = useCommunityQuery();
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const openCreate = useCallback(() => setCreating(true), []);
  const closeCreate = useCallback(() => setCreating(false), []);

  if (isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Community"
          eyebrow="Groups and boards"
          backLabel="Back"
        />
        <CommunitySkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Community"
          eyebrow="Groups and boards"
          backLabel="Back"
        />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
        title="Community"
        eyebrow="Groups and boards"
        backLabel="Back"
        // The only route to making a group that a client can reach without
        // going through Messages. Until this existed, `/community/new-group`
        // was opened from exactly one place — the Messages header — and that
        // header was hidden from clients, so a client could not make a group
        // at all.
        action={<CommunityNewButton onNew={openCreate} />}
      />
      <CommunityContent community={data} refreshing={isRefetching} onRefresh={refresh} />
      <CommunityCreateSheet visible={creating} onClose={closeCreate} />
    </LISafeArea>
  );
}
