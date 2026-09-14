import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import type { ApiRoster } from '@/api/types';
import {
  filterRosterClients,
  groupRosterClients,
  nextRosterSort,
  sortRosterClients,
  type RosterAttentionFilter,
  type RosterSort,
} from '@/lib/roster';
import { useRosterFilterStore } from '@/store/rosterFilterStore';
import { tokens } from '@/theme/tokens';

import RosterEmptyState from './RosterEmptyState';
import RosterGroups from './RosterGroups';
import RosterHeader from './RosterHeader';
import RosterNoResults from './RosterNoResults';

interface RosterContentProps {
  readonly roster: ApiRoster;
  /** `undefined` while the code is still loading — the card shows a skeleton. */
  readonly inviteCode: string | undefined;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

/**
 * One query, fetched by the route; every control below is local state derived
 * from it. The label filter is the exception — the labels screen sets it and
 * pops back, so it lives in a store the two screens share.
 */
export default function RosterContent({
  roster,
  inviteCode,
  refreshing,
  onRefresh,
}: RosterContentProps) {
  const [query, setQuery] = useState('');
  const [attention, setAttention] = useState<RosterAttentionFilter>('all');
  const [sort, setSort] = useState<RosterSort>('recent');
  const labelId = useRosterFilterStore((state) => state.labelId);
  const setLabelId = useRosterFilterStore((state) => state.setLabelId);

  const groups = useMemo(() => {
    const matching = filterRosterClients(roster.clients, { query, attention, labelId });
    return groupRosterClients(sortRosterClients(matching, sort), sort, roster.labels);
  }, [roster.clients, roster.labels, query, attention, labelId, sort]);

  const cycleSort = useCallback(() => setSort(nextRosterSort), []);

  const clearFilters = useCallback(() => {
    setQuery('');
    setAttention('all');
    setLabelId(null);
  }, [setLabelId]);

  // No clients at all is a different screen from no matches — the first is the
  // coach's first run, the second is a filter they set a second ago.
  if (roster.clients.length === 0) {
    return (
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 pb-10 pt-2"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
        }
      >
        <RosterEmptyState inviteCode={inviteCode} />
      </ScrollView>
    );
  }

  return (
    <View className="flex-1">
      <RosterGroups
        groups={groups}
        labels={roster.labels}
        refreshing={refreshing}
        onRefresh={onRefresh}
        header={
          <RosterHeader
            clients={roster.clients}
            labels={roster.labels}
            query={query}
            onQueryChange={setQuery}
            sort={sort}
            onCycleSort={cycleSort}
            attention={attention}
            onAttentionChange={setAttention}
            labelId={labelId}
            onLabelChange={setLabelId}
          />
        }
        empty={<RosterNoResults query={query.trim()} onClear={clearFilters} />}
      />
    </View>
  );
}
