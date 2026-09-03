import { Plus } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import type { ApiQuickFood } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

interface QuickAddRowProps {
  readonly food: ApiQuickFood;
  readonly onAdd: (food: ApiQuickFood) => void;
  readonly disabled: boolean;
}

const QuickAddRow = memo(function QuickAddRow({ food, onAdd, disabled }: QuickAddRowProps) {
  return (
    <Pressable
      onPress={() => onAdd(food)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Log ${food.name}, ${food.kcal} calories`}
      accessibilityState={{ disabled }}
      className="flex-row items-center gap-3 active:opacity-70"
      testID={`food-quick-add-${food.id}`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-pill border border-dashed border-violet-line">
        <Plus color={tokens.violet} size={16} />
      </View>
      <View className="flex-1 gap-0.5">
        <LIText size="p" color="primary" text={food.name} className="font-geist-medium" />
        <LIText size="caption" color="muted" text={food.meta} className="font-geist" />
      </View>
      <LIText size="p" color="body" text={`${food.kcal}`} className="font-geist-medium" />
    </Pressable>
  );
});

interface FoodQuickAddProps {
  readonly quickAdd: readonly ApiQuickFood[];
  readonly onAdd: (food: ApiQuickFood) => void;
  readonly adding: boolean;
}

export default function FoodQuickAdd({ quickAdd, onAdd, adding }: FoodQuickAddProps) {
  return (
    <View className="gap-2">
      <LIText
        size="caption"
        color="muted"
        text="QUICK ADD"
        className="font-geist-medium uppercase tracking-wide"
      />

      {quickAdd.length === 0 ? (
        <LICard>
          <LIText
            size="caption"
            color="muted"
            text="Foods you log often show up here."
            className="font-geist"
          />
        </LICard>
      ) : (
        <LICard className="gap-3">
          {quickAdd.map((food) => (
            <QuickAddRow key={food.id} food={food} onAdd={onAdd} disabled={adding} />
          ))}
        </LICard>
      )}
    </View>
  );
}
