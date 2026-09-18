import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { RefreshControl, View } from 'react-native';

import type { ApiCoachGroupSummary, ApiInboxEntry } from '@/api/types';
import { LIList } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

import InboxEmptyState from './InboxEmptyState';
import InboxGroupRows from './InboxGroupRows';
import InboxNote from './InboxNote';
import InboxNoResults from './InboxNoResults';
import InboxRow from './InboxRow';
import InboxSearchBar from './InboxSearchBar';

/** The card is drawn by the rows, so each one knows where it sits in it. */
interface InboxListRow {
  readonly entry: ApiInboxEntry;
  readonly first: boolean;
  readonly last: boolean;
}

interface InboxContentProps {
  /** Already filtered — the search runs server-side, on the query below. */
  readonly entries: readonly ApiInboxEntry[];
  /** Groups the reader is in, listed above the 1:1 threads. */
  readonly groups: readonly ApiCoachGroupSummary[];
  /**
   * Which seat is reading. A coach has a thread per client and each has its
   * own route; a client has at most one — their coach — and it has a screen of
   * its own that predates this list.
   */
  readonly isClient: boolean;
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

export default function InboxContent({
  entries,
  groups,
  isClient,
  query,
  onQueryChange,
  refreshing,
  onRefresh,
}: InboxContentProps) {
  const tokens = useThemeTokens();
  const router = useRouter();
  const trimmed = query.trim();

  const openThread = useCallback(
    (clientId: string) => router.push(isClient ? '/coach/chat' : `/messages/${clientId}`),
    [isClient, router],
  );

  const clearSearch = useCallback(() => onQueryChange(''), [onQueryChange]);

  const rows = useMemo<readonly InboxListRow[]>(
    () =>
      entries.map((entry, index) => ({
        entry,
        first: index === 0,
        last: index === entries.length - 1,
      })),
    [entries],
  );

  const renderItem = useCallback(
    ({ item }: { item: InboxListRow }) => (
      <InboxRow entry={item.entry} onPress={openThread} first={item.first} last={item.last} />
    ),
    [openThread],
  );

  return (
    <View className="flex-1">
      <LIList
        data={[...rows]}
        keyExtractor={(row) => row.entry.clientId}
        renderItem={renderItem}
        // Groups sit inside the header rather than in the data: they are a
        // different kind of row with a different destination, and folding them
        // into the same list would put them in the reach of a search that only
        // knows how to match clients.
        ListHeaderComponent={
          <>
            <InboxSearchBar query={query} onQueryChange={onQueryChange} />
            {trimmed.length === 0 ? <InboxGroupRows groups={groups} /> : null}
          </>
        }
        // An empty inbox and an empty search result are two different
        // situations: the first is a coach who has never been written to, the
        // second is four characters they typed a second ago.
        ListEmptyComponent={
          trimmed.length > 0 ? (
            <InboxNoResults query={trimmed} onClear={clearSearch} />
          ) : (
            <InboxEmptyState isClient={isClient} />
          )
        }
        ListFooterComponent={rows.length > 0 ? <InboxNote isClient={isClient} /> : null}
        contentContainerClassName="px-4 pb-10 pt-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
        }
        testID="inbox-list"
      />
    </View>
  );
}
