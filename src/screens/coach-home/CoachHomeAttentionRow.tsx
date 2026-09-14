import { View } from 'react-native';

import type { ApiRosterClient } from '@/api/types';
import { LIAvatar, LIBadge, LICard, LIText } from '@/components/ui';

interface CoachHomeAttentionRowProps {
  readonly client: ApiRosterClient;
  readonly onOpen: (clientId: string) => void;
}

/**
 * Why this person is on the screen, said in the badge rather than left to the
 * coach to work out. "Finished a session" and "has not trained in weeks" are
 * opposite problems and should not look the same.
 */
const REASON: Partial<Record<ApiRosterClient['attention'], string>> = {
  review: 'Finished a session',
  quiet: 'Gone quiet',
};

export default function CoachHomeAttentionRow({
  client,
  onOpen,
}: CoachHomeAttentionRowProps) {
  return (
    <LICard
      className="flex-row items-center gap-3"
      onPress={() => onOpen(client.id)}
      testID={`coach-home-attention-${client.id}`}
    >
      <LIAvatar name={client.name} />
      <View className="flex-1 gap-0.5">
        <LIText
          size="h5"
          color="primary"
          text={client.name}
          numberOfLines={1}
          className="font-geist-semibold"
        />
        <LIText
          size="caption"
          color="muted"
          text={client.meta}
          numberOfLines={1}
          className="font-geist"
        />
      </View>
      <View className="items-end gap-1">
        <LIBadge
          tone={client.attention === 'review' ? 'violet' : 'neutral'}
          label={REASON[client.attention] ?? 'Needs a look'}
          labelClassName="font-geist-medium"
        />
        <LIText size="caption" color="muted" text={client.when} className="font-geist" />
      </View>
    </LICard>
  );
}
