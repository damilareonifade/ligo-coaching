import { useCallback } from 'react';

import { useIntegrationsQuery } from '@/api/clientProfile';
import { LIErrorState, LISafeArea } from '@/components/ui';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import IntegrationsContent from '@/screens/profile-integrations/IntegrationsContent';
import IntegrationsSkeleton from '@/screens/profile-integrations/IntegrationsSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/** Composer only — ScreenHeader sits inside the safe area, which owns the inset. */
export default function IntegrationsScreen() {
  const { data, isPending, error, refetch } = useIntegrationsQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Integrations"
          eyebrow="Connected apps"
          backLabel="Profile"
        />
        <IntegrationsSkeleton />
      </LISafeArea>
    );
  }

  if (error || !data) {
    return (
      <LISafeArea>
        <ScreenHeader
          title="Integrations"
          eyebrow="Connected apps"
          backLabel="Profile"
        />
        <LIErrorState message={error?.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  return (
    <LISafeArea>
      <ScreenHeader
        title="Integrations"
        eyebrow="Connected apps"
        backLabel="Profile"
      />
      <IntegrationsContent integrations={data} />
    </LISafeArea>
  );
}
