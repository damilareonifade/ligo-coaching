import { View } from 'react-native';

import type { ApiLiveClient } from '@/api/types';
import { LIAvatar, LIBadge, LICard, LIText } from '@/components/ui';

interface CoachHomeLiveCardProps {
  readonly client: ApiLiveClient;
  readonly onOpen: (clientId: string) => void;
}

/**
 * Somebody lifting right now, and the one tap that gets the coach into their
 * session. The whole card is the target rather than a button on it — this is
 * read across a gym at arm's length.
 */
export default function CoachHomeLiveCard({ client, onOpen }: CoachHomeLiveCardProps) {
  return (
    <LICard
      className="gap-3 bg-violet-weak"
      onPress={() => onOpen(client.clientId)}
      testID={`coach-home-live-${client.clientId}`}
    >
      <View className="flex-row items-center gap-3">
        <LIAvatar name={client.name} className="bg-white" labelClassName="text-violet" />
        <View className="flex-1 gap-0.5">
          <LIText
            size="h5"
            color="primary"
            text={client.name}
            numberOfLines={1}
            className="font-geist-semibold"
          />
          <LIText size="caption" color="body" text={client.meta} className="font-geist" />
        </View>
        <LIBadge tone="violet" label="Live" labelClassName="font-geist-medium" />
      </View>

      <LIText size="caption" color="muted" text={client.progress} className="font-geist" />
    </LICard>
  );
}
