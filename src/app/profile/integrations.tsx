import { useCallback } from 'react';

import { useIntegrationsQuery } from '@/api/clientProfile';
import { LIErrorState, LISafeArea } from '@/components/ui';
import IntegrationsContent from '@/screens/profile-integrations/IntegrationsContent';
import IntegrationsSkeleton from '@/screens/profile-integrations/IntegrationsSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — the header owns the top inset, so no safe-area edges here. */
export default function IntegrationsScreen() {
  const { data, isPending, error, refetch } = useIntegrationsQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea edges={[]}>
        <IntegrationsSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea edges={[]}>
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea edges={[]}>
      <IntegrationsContent integrations={data} />
    </LISafeArea>
  );
}
