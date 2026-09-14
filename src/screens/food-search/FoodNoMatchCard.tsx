import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { LIButton, LICard, LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';

interface FoodNoMatchCardProps {
  readonly query: string;
}

/**
 * A miss is the most common moment in food logging, not an error state — so it
 * offers the two ways out rather than apologising.
 */
export default function FoodNoMatchCard({ query }: FoodNoMatchCardProps) {
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const stub = useCallback(() => showToast('Not connected yet', 'success'), [showToast]);
  const createFood = useCallback(() => router.push('/food/new'), [router]);

  return (
    <LICard className="gap-3 border border-dashed border-border-strong bg-transparent">
      <LIText
        size="h5"
        color="primary"
        text={`No match for "${query}"`}
        className="font-geist-semibold"
      />
      <LIText
        size="caption"
        color="muted"
        text="Add it once with the label values and it stays in your foods, searchable next time."
        className="font-geist"
      />
      <View className="flex-row gap-3">
        <LIButton
          title="Create a food"
          onPress={createFood}
          className="flex-1"
          testID="food-search-create"
        />
        <LIButton
          title="Scan barcode"
          onPress={stub}
          variant="outline"
          className="flex-1"
          testID="food-search-scan"
        />
      </View>
    </LICard>
  );
}
