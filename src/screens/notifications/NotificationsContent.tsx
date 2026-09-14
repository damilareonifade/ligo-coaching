import { useCallback, useMemo } from 'react';
import { RefreshControl, View } from 'react-native';

import { useMarkNotificationReadMutation } from '@/api/notifications';
import type { ApiNotification, ApiNotificationGroup } from '@/api/types';
import { LIList, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useThemeTokens } from '@/theme/tokens';

import NotificationRow from './NotificationRow';
import NotificationsEmptyState from './NotificationsEmptyState';
import NotificationsNote from './NotificationsNote';

/**
 * Headers and rows in one flat list, the same shape the roster uses: FlashList
 * can only recycle what it owns, and a feed has no ceiling. The card is drawn
 * by the rows — first and last of each group round, the rest divide.
 */
type NotificationListItem =
  | { readonly kind: 'header'; readonly key: string; readonly title: string }
  | {
      readonly kind: 'row';
      readonly key: string;
      readonly item: ApiNotification;
      readonly first: boolean;
      readonly last: boolean;
    };

interface NotificationsContentProps {
  readonly groups: readonly ApiNotificationGroup[];
  /** Changes only the two sentences that read differently from each side. */
  readonly isCoach: boolean;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

export default function NotificationsContent({
  groups,
  isCoach,
  refreshing,
  onRefresh,
}: NotificationsContentProps) {
  const tokens = useThemeTokens();
  const { mutate: markRead } = useMarkNotificationReadMutation();

  const items = useMemo<readonly NotificationListItem[]>(
    () =>
      groups.flatMap((group) => [
        { kind: 'header' as const, key: `header-${group.id}`, title: group.title },
        ...group.items.map((item, index) => ({
          kind: 'row' as const,
          key: item.id,
          item,
          first: index === 0,
          last: index === group.items.length - 1,
        })),
      ]),
    [groups],
  );

  const handleRead = useCallback((id: string) => markRead(id), [markRead]);

  const renderItem = useCallback(
    ({ item, index }: { item: NotificationListItem; index: number }) => {
      if (item.kind === 'header') {
        return (
          <View className={cn('pb-2', index > 0 && 'pt-5')}>
            <LIText
              size="caption"
              color="muted"
              text={item.title}
              className="font-geist-medium uppercase tracking-wide"
            />
          </View>
        );
      }

      return (
        <NotificationRow
          item={item.item}
          onRead={handleRead}
          first={item.first}
          last={item.last}
        />
      );
    },
    [handleRead],
  );

  return (
    <LIList
      data={[...items]}
      keyExtractor={(item) => item.key}
      getItemType={(item) => item.kind}
      renderItem={renderItem}
      contentContainerClassName="px-4 pb-10 pt-2"
      ListEmptyComponent={<NotificationsEmptyState isCoach={isCoach} />}
      ListFooterComponent={items.length > 0 ? <NotificationsNote isCoach={isCoach} /> : null}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
      }
      testID="notifications-list"
    />
  );
}
