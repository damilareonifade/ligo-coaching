import { useCallback } from 'react';
import { ScrollView } from 'react-native';

import { useToggleIntegrationMutation } from '@/api/clientProfile';
import type { ApiIntegration } from '@/api/types';

import IntegrationCard from './IntegrationCard';
import IntegrationsPrivacyNotice from './IntegrationsPrivacyNotice';

interface IntegrationsContentProps {
  readonly integrations: readonly ApiIntegration[];
}

export default function IntegrationsContent({ integrations }: IntegrationsContentProps) {
  const toggle = useToggleIntegrationMutation();
  const pendingId = toggle.isPending ? toggle.variables?.id : undefined;

  const handleToggle = useCallback(
    (integration: ApiIntegration) => {
      toggle.mutate({ id: integration.id, connected: !integration.connected });
    },
    [toggle],
  );

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 px-4 pb-8 pt-2">
      <IntegrationsPrivacyNotice />
      {integrations.map((integration) => (
        <IntegrationCard
          key={integration.id}
          integration={integration}
          pending={pendingId === integration.id}
          onToggle={() => handleToggle(integration)}
        />
      ))}
    </ScrollView>
  );
}
