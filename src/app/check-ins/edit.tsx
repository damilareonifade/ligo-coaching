import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useCheckInsQuery } from '@/api/clientCheckIns';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import CheckInEditForm from '@/screens/check-in-edit/CheckInEditForm';
import CheckInEditSkeleton from '@/screens/check-in-edit/CheckInEditSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * Composer only. The list is the source of the prefill, so the same query backs
 * both screens — arriving from the list it is already cached and never blanks.
 */
export default function CheckInEditScreen() {
  const { id, clientId } = useLocalSearchParams<{ id?: string; clientId?: string }>();
  const { data, isPending, error, refetch } = useCheckInsQuery(clientId);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Check-in"
          eyebrow="This month"
          backLabel="Check-ins"
        />
        <CheckInEditSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Check-in"
          eyebrow="This month"
          backLabel="Check-ins"
        />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
        title="Check-in"
        eyebrow="This month"
        backLabel="Check-ins"
      />
      <CheckInEditForm checkIns={data} id={id} clientId={clientId} />
    </LISafeArea>
  );
}
