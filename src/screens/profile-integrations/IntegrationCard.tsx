import { View } from 'react-native';

import type { ApiIntegration } from '@/api/types';
import { LIBadge, LIButton, LICard, LIText } from '@/components/ui';

interface IntegrationCardProps {
  readonly integration: ApiIntegration;
  readonly onToggle: () => void;
  readonly pending: boolean;
}

/**
 * Status is stated twice on purpose — as a badge for scanning the list, and as
 * the flow chips for what it actually means: what this app can read and write.
 */
export default function IntegrationCard({
  integration,
  onToggle,
  pending,
}: IntegrationCardProps) {
  const { connected } = integration;

  return (
    <LICard className="gap-3" testID={`integration-${integration.id}`}>
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-violet-weak">
          <LIText
            size="caption"
            color="accent"
            text={integration.mark}
            className="font-geist-semibold"
          />
        </View>
        <View className="flex-1 gap-0.5">
          <LIText
            size="p"
            color="primary"
            text={integration.name}
            className="font-geist-semibold"
          />
          <LIText size="caption" color="muted" text={integration.desc} className="font-geist" />
        </View>
        <LIBadge
          tone={connected ? 'violet' : 'neutral'}
          label={integration.status}
          labelClassName="font-geist-medium"
        />
      </View>

      <View className="flex-row items-center gap-2 border-t border-border pt-3">
        {integration.flows.map((flow) => (
          <LIBadge
            key={flow.label}
            tone={flow.active ? 'violet' : 'neutral'}
            label={flow.label}
            labelClassName="font-geist-medium"
          />
        ))}
        <View className="flex-1" />
        <LIButton
          size="sm"
          variant={connected ? 'outline' : 'violet'}
          title={connected ? 'Disconnect' : 'Connect'}
          loading={pending}
          onPress={onToggle}
          testID={`integration-toggle-${integration.id}`}
        />
      </View>
    </LICard>
  );
}
