import { Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { LIInput } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

interface FoodSearchFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export default function FoodSearchField({ value, onChange }: FoodSearchFieldProps) {
  const tokens = useThemeTokens();
  const [focused, setFocused] = useState(false);

  return (
    <LIInput
      autoFocus
      value={value}
      onChangeText={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder="Search foods, meals or a barcode"
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      accessibilityLabel="Search foods"
      // The border is the only focus cue on a screen with no other chrome.
      fieldClassName={focused ? 'border-violet' : undefined}
      leading={<Search color={tokens['foreground-subtle']} size={18} />}
      trailing={
        value.length > 0 ? (
          <Pressable
            onPress={() => onChange('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            testID="food-search-clear"
          >
            <X color={tokens['foreground-subtle']} size={18} />
          </Pressable>
        ) : null
      }
      testID="food-search-input"
    />
  );
}
