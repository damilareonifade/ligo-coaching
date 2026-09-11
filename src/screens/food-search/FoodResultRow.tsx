import { memo } from 'react';
import { Pressable, View } from 'react-native';

import type { ApiFoodResult } from '@/api/types';
import { LIBadge, LIText } from '@/components/ui';

interface FoodResultRowProps {
  readonly result: ApiFoodResult;
  readonly onPress: (result: ApiFoodResult) => void;
  readonly disabled: boolean;
}

function FoodResultRowBase({ result, onPress, disabled }: FoodResultRowProps) {
  return (
    <Pressable
      onPress={() => onPress(result)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Log ${result.name}, ${result.kcal} calories`}
      accessibilityState={{ disabled }}
      className="flex-row items-center gap-3 rounded-card bg-white p-4 active:opacity-70"
      testID={`food-result-${result.id}`}
    >
      <View className="flex-1 gap-0.5">
        <LIText size="p" color="primary" text={result.name} className="font-geist-medium" />
        <LIText size="caption" color="muted" text={result.meta} className="font-geist" />
      </View>
      <LIText size="p" color="body" text={`${result.kcal}`} className="font-geist-medium" />
      <LIBadge
        tone={result.source === 'Your foods' ? 'violet' : 'neutral'}
        label={result.source}
        labelClassName="font-geist-medium"
      />
    </Pressable>
  );
}

/** Rows recycle inside FlashList — memo keeps a scroll from re-rendering them all. */
export default memo(FoodResultRowBase);
