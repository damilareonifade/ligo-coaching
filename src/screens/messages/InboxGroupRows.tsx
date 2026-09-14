import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useCallback } from 'react';
import { View } from 'react-native';

import type { ApiCoachGroupSummary } from '@/api/types';
import { LIBadge, LICard, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useThemeTokens } from '@/theme/tokens';

interface InboxGroupRowsProps {
  readonly groups: readonly ApiCoachGroupSummary[];
}

/**
 * The coach's groups, above their 1:1 threads.
 *
 * They are badged rather than blended in, and that badge is a warning as much
 * as a label: typing into a group is typing to seven people at once, and the
 * one mistake worth designing against in an inbox is answering one client in
 * front of everybody. The member count sits on the row for the same reason.
 */
export default function InboxGroupRows({ groups }: InboxGroupRowsProps) {
  const tokens = useThemeTokens();
  const router = useRouter();

  const open = useCallback(
    (groupId: string) => router.push(`/community/group/${groupId}`),
    [router],
  );

  if (groups.length === 0) return null;

  return (
    <View className="gap-2 pb-4">
      <LIText
        size="caption"
        color="muted"
        text="GROUPS"
        className="px-1 font-geist-medium tracking-wide"
      />

      <View>
        {groups.map((group, index) => (
          <LICard
            key={group.id}
            onPress={() => open(group.id)}
            className={cn(
              'gap-0 rounded-none px-4 py-3',
              index === 0 && 'rounded-t-card',
              index === groups.length - 1 && 'rounded-b-card',
              index > 0 && 'border-t border-border',
            )}
            testID={`inbox-group-${group.id}`}
          >
            <View className="flex-row items-center gap-3">
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-2">
                  <LIText
                    size="p"
                    color="primary"
                    text={group.name}
                    numberOfLines={1}
                    className="shrink font-geist-medium"
                  />
                  <LIBadge
                    tone="violet"
                    label="Group"
                    className="px-2 py-0.5"
                    labelClassName="font-geist-medium"
                  />
                </View>

                <LIText
                  size="caption"
                  color="muted"
                  text={group.preview}
                  numberOfLines={1}
                  className="font-geist"
                />
                <LIText
                  size="caption"
                  color="muted"
                  text={`${group.memberCount} members`}
                  className="font-geist"
                />
              </View>

              {group.when.length > 0 ? (
                <LIText
                  size="caption"
                  color="muted"
                  text={group.when}
                  className="font-geist-medium"
                />
              ) : null}

              <ChevronRight color={tokens['foreground-subtle']} size={18} />
            </View>
          </LICard>
        ))}
      </View>
    </View>
  );
}
