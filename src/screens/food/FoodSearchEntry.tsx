import { useRouter } from 'expo-router';
import { Barcode, Search } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable } from 'react-native';

import { LIText } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

/**
 * Looks like a search field but is a door: tapping anywhere on it opens the
 * full-screen search, so the keyboard never fights the tab bar for space.
 */
export default function FoodSearchEntry() {
  const tokens = useThemeTokens();
  const router = useRouter();
  const open = useCallback(() => router.push('/food/search'), [router]);

  return (
    <Pressable
      onPress={open}
      accessibilityRole="search"
      accessibilityLabel="Search foods, meals or a barcode"
      className="h-11 flex-row items-center gap-2 rounded-2xl border border-border-strong bg-surface px-3 active:opacity-70"
      testID="food-search-entry"
    >
      <Search color={tokens['foreground-subtle']} size={18} />
      <LIText
        size="p"
        color="muted"
        text="Search foods, meals or a barcode"
        className="flex-1 font-geist"
        numberOfLines={1}
      />
      <Barcode color={tokens['foreground-subtle']} size={18} />
    </Pressable>
  );
}
