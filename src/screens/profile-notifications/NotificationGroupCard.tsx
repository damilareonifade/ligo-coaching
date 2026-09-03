import { Pressable, View } from 'react-native';

import type { ApiNotificationGroup, ApiNotificationToggle } from '@/api/types';
import { LICard, LISwitch, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';

interface NotificationGroupCardProps {
  readonly group: ApiNotificationGroup;
  readonly onToggle: (row: ApiNotificationToggle) => void;
}

/**
 * The whole row is the target, not just the knob — a 44pt switch is a small
 * thing to hit one-handed. The note sits under the card rather than inside it
 * so it reads as a caveat on the group, not as another setting.
 */
export default function NotificationGroupCard({ group, onToggle }: NotificationGroupCardProps) {
  return (
    <View className="gap-2">
      <LIText
        size="caption"
        color="muted"
        text={group.title}
        className="px-1 font-geist-medium"
      />

      <LICard className="py-1">
        {group.rows.map((row, index) => (
          <Pressable
            key={row.id}
            onPress={() => onToggle(row)}
            accessibilityRole="switch"
            accessibilityState={{ checked: row.enabled }}
            accessibilityLabel={`${row.label}. ${row.desc}`}
            className={cn(
              'flex-row items-center gap-3 py-3 active:opacity-70',
              index > 0 && 'border-t border-hairline',
            )}
            testID={`notification-row-${group.id}-${row.id}`}
          >
            <View className="flex-1 gap-0.5">
              <LIText size="p" color="primary" text={row.label} className="font-geist-medium" />
              <LIText size="caption" color="muted" text={row.desc} className="font-geist" />
            </View>
            <LISwitch value={row.enabled} onValueChange={() => onToggle(row)} />
          </Pressable>
        ))}
      </LICard>

      <LIText size="caption" color="muted" text={group.note} className="px-1 font-geist" />
    </View>
  );
}
