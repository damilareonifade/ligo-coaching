import { ArrowUpDown, Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { LIButton, LIInput } from '@/components/ui';
import { rosterSortLabel, type RosterSort } from '@/lib/roster';
import { useThemeTokens } from '@/theme/tokens';

interface RosterSearchBarProps {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly sort: RosterSort;
  /** Tapping the button walks the sort ring — no menu, one thumb. */
  readonly onCycleSort: () => void;
}

export default function RosterSearchBar({
  query,
  onQueryChange,
  sort,
  onCycleSort,
}: RosterSearchBarProps) {
  const tokens = useThemeTokens();
  const [focused, setFocused] = useState(false);

  return (
    <View className="flex-row items-center gap-2">
      <LIInput
        variant="filled"
        value={query}
        onChangeText={onQueryChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search by name or program"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search the roster"
        containerClassName="flex-1"
        fieldClassName={focused ? 'border-violet' : undefined}
        leading={<Search color={tokens['foreground-subtle']} size={18} />}
        trailing={
          query.length > 0 ? (
            <Pressable
              onPress={() => onQueryChange('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              testID="roster-search-clear"
            >
              <X color={tokens['foreground-subtle']} size={18} />
            </Pressable>
          ) : null
        }
        testID="roster-search-input"
      />

      <LIButton
        title={rosterSortLabel[sort]}
        onPress={onCycleSort}
        variant="social"
        shape="rounded"
        icon={<ArrowUpDown color={tokens['foreground-subtle']} size={16} />}
        accessibilityLabel={`Sort: ${rosterSortLabel[sort]}. Change sort`}
        className="h-12 px-4"
        labelClassName="text-caption font-geist-medium text-foreground-muted"
        testID="roster-sort-button"
      />
    </View>
  );
}
