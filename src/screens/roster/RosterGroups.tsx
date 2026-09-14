import { useRouter } from 'expo-router';
import { useCallback, useMemo, type ReactElement } from 'react';
import { RefreshControl, View } from 'react-native';

import type { ApiRosterClient, ApiRosterLabel } from '@/api/types';
import { LIList, LIText } from '@/components/ui';
import type { RosterGroup } from '@/lib/roster';
import { cn } from '@/lib/utils';
import { useThemeTokens } from '@/theme/tokens';

import RosterRow from './RosterRow';

/**
 * Groups are flattened into one list rather than nesting a list per card:
 * FlashList can only recycle what it owns, and a coach with two hundred
 * clients is exactly who this screen is for. The card is drawn by the rows —
 * the first and last of each group round, the rest divide.
 */
type RosterListItem =
  | { readonly kind: 'header'; readonly key: string; readonly title: string; readonly count: number }
  | {
      readonly kind: 'row';
      readonly key: string;
      readonly client: ApiRosterClient;
      readonly label: ApiRosterLabel | null;
      readonly first: boolean;
      readonly last: boolean;
    };

interface RosterGroupsProps {
  readonly groups: readonly RosterGroup[];
  readonly labels: readonly ApiRosterLabel[];
  /** Stats, search, filters — everything above the first group. */
  readonly header: ReactElement;
  /** Shown when the filters match nobody. */
  readonly empty: ReactElement;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

export default function RosterGroups({
  groups,
  labels,
  header,
  empty,
  refreshing,
  onRefresh,
}: RosterGroupsProps) {
  const tokens = useThemeTokens();
  const router = useRouter();

  const openClient = useCallback(
    (clientId: string) => router.push(`/student/${clientId}`),
    [router],
  );

  const items = useMemo<readonly RosterListItem[]>(() => {
    const byId = new Map(labels.map((label) => [label.id, label]));

    return groups.flatMap((group) => [
      {
        kind: 'header' as const,
        key: `header-${group.id}`,
        title: group.title,
        count: group.clients.length,
      },
      ...group.clients.map((client, index) => ({
        kind: 'row' as const,
        key: client.id,
        client,
        label: client.labelId ? (byId.get(client.labelId) ?? null) : null,
        first: index === 0,
        last: index === group.clients.length - 1,
      })),
    ]);
  }, [groups, labels]);

  const renderItem = useCallback(
    ({ item, index }: { item: RosterListItem; index: number }) => {
      if (item.kind === 'header') {
        return (
          <View
            className={cn('flex-row items-center justify-between pb-2', index > 0 && 'pt-5')}
          >
            <LIText
              size="caption"
              color="muted"
              text={item.title}
              className="font-geist-medium uppercase tracking-wide"
            />
            <LIText
              size="caption"
              color="muted"
              text={`${item.count}`}
              className="font-geist-medium"
            />
          </View>
        );
      }

      return (
        <RosterRow
          client={item.client}
          label={item.label}
          onPress={openClient}
          first={item.first}
          last={item.last}
        />
      );
    },
    [openClient],
  );

  return (
    <LIList
      data={[...items]}
      keyExtractor={(item) => item.key}
      getItemType={(item) => item.kind}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      contentContainerClassName="px-4 pb-10"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
      }
    />
  );
}
