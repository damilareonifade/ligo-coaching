import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { RefreshControl, View } from 'react-native';

import { useMarkActivityReadMutation } from '@/api/coachActivity';
import type { ApiActivityGroup, ApiActivityItem } from '@/api/types';
import { LIList, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

import ActivityEmptyState from './ActivityEmptyState';
import ActivityNote from './ActivityNote';
import ActivityRow from './ActivityRow';

/**
 * Headers and rows in one flat list, the same shape the roster uses: FlashList
 * can only recycle what it owns, and a coach with a full roster generates a
 * feed with no ceiling. The card is drawn by the rows — first and last of each
 * group round, the rest divide.
 */
type ActivityListItem =
  | { readonly kind: 'header'; readonly key: string; readonly title: string }
  | {
      readonly kind: 'row';
      readonly key: string;
      readonly item: ApiActivityItem;
      readonly first: boolean;
      readonly last: boolean;
    };

interface ActivityContentProps {
  readonly groups: readonly ApiActivityGroup[];
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

export default function ActivityContent({
  groups,
  refreshing,
  onRefresh,
}: ActivityContentProps) {
  const router = useRouter();
  const { mutate: markRead } = useMarkActivityReadMutation();

  /**
   * Read and open are one gesture. The failure mode is silent on purpose: the
   * coach is already on the client's screen, and a toast about a read receipt
   * would be louder than the thing it failed to do.
   */
  const openItem = useCallback(
    (item: ApiActivityItem) => {
      if (item.unread) markRead(item.id);
      router.push(`/student/${item.clientId}`);
    },
    [markRead, router],
  );

  const items = useMemo<readonly ActivityListItem[]>(
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

  const renderItem = useCallback(
    ({ item, index }: { item: ActivityListItem; index: number }) => {
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
        <ActivityRow
          item={item.item}
          onPress={openItem}
          first={item.first}
          last={item.last}
        />
      );
    },
    [openItem],
  );

  return (
    <LIList
      data={[...items]}
      keyExtractor={(item) => item.key}
      getItemType={(item) => item.kind}
      renderItem={renderItem}
      contentContainerClassName="px-4 pb-10 pt-2"
      ListEmptyComponent={<ActivityEmptyState />}
      ListFooterComponent={items.length > 0 ? <ActivityNote /> : null}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
      }
      testID="activity-list"
    />
  );
}
