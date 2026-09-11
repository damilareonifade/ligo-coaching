import { Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { LIInput } from '@/components/ui';
import { tokens } from '@/theme/tokens';

interface InboxSearchBarProps {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
}

/**
 * Name or message text, because a coach remembers a conversation either way —
 * "the one about the incline volume" arrives long before the name attached to
 * it does. The placeholder promises both, so the filter has to honour both.
 */
export default function InboxSearchBar({ query, onQueryChange }: InboxSearchBarProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="pb-3">
      <LIInput
        variant="filled"
        value={query}
        onChangeText={onQueryChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search by name or message"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search your conversations"
        fieldClassName={focused ? 'border-violet' : undefined}
        leading={<Search color={tokens.muted} size={18} />}
        trailing={
          query.length > 0 ? (
            <Pressable
              onPress={() => onQueryChange('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              testID="inbox-search-clear"
            >
              <X color={tokens.muted} size={18} />
            </Pressable>
          ) : null
        }
        testID="inbox-search-input"
      />
    </View>
  );
}
