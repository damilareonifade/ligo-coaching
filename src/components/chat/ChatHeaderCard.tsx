import { View } from 'react-native';

import { LIAvatar, LIBadge, LICard, LIText } from '@/components/ui';

interface ChatHeaderCardProps {
  readonly name: string;
  /** A line under the name. Omitted when the name is the whole story. */
  readonly context?: string;
  readonly badgeLabel: string;
  readonly onPressBadge: () => void;
  readonly badgeTestID?: string;
}

/**
 * The permission badge is the target, not decoration. Both seats ask the same
 * question mid-thread — the client asks "what can he actually see?", the coach
 * asks "what did she share?" — and either way the answer is one tap away.
 */
export default function ChatHeaderCard({
  name,
  context,
  badgeLabel,
  onPressBadge,
  badgeTestID,
}: ChatHeaderCardProps) {
  return (
    <LICard className="flex-row items-center gap-3">
      <LIAvatar name={name} size="md" labelClassName="font-geist-semibold" />

      <View className="flex-1 gap-0.5">
        <LIText size="h5" color="primary" text={name} className="font-geist-semibold" />
        {context ? (
          <LIText size="caption" color="muted" text={context} className="font-geist" />
        ) : null}
      </View>

      <LIBadge
        tone="violet"
        label={badgeLabel}
        labelClassName="font-geist-medium"
        onPress={onPressBadge}
        testID={badgeTestID ?? 'chat-permissions-chip'}
      />
    </LICard>
  );
}
