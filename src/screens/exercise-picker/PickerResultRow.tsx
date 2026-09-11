import { Plus } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { Pressable, View } from 'react-native';

import type { ApiExerciseOption } from '@/api/types';
import { LIBadge, LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

interface PickerResultRowProps {
  readonly option: ApiExerciseOption;
  readonly onAdd: (option: ApiExerciseOption) => void;
  readonly disabled: boolean;
}

function PickerResultRowBase({ option, onAdd, disabled }: PickerResultRowProps) {
  const add = useCallback(() => onAdd(option), [onAdd, option]);

  return (
    <Pressable
      onPress={add}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Add ${option.name}, ${option.meta}`}
      accessibilityState={{ disabled }}
      className="flex-row items-center gap-3 rounded-card bg-white px-4 py-3 active:opacity-70"
      testID={`picker-result-${option.id}`}
    >
      <View className="flex-1 gap-0.5">
        <LIText
          size="p"
          color="primary"
          text={option.name}
          numberOfLines={1}
          className="font-geist-medium"
        />
        <LIText
          size="caption"
          color="muted"
          text={option.meta}
          numberOfLines={1}
          className="font-geist"
        />
      </View>

      <LIBadge
        tone={option.tag === 'Yours' ? 'violet' : 'neutral'}
        label={option.tag}
        labelClassName="font-geist-medium"
      />

      {/* Part of the row's own press target, not a second button — a screen
          reader hears one "Add Bench press", which is what a tap does. */}
      <View className="h-8 w-8 items-center justify-center rounded-pill border border-violet">
        <Plus color={tokens.violet} size={16} />
      </View>
    </Pressable>
  );
}

/** Rows recycle inside FlashList — memo keeps a scroll from re-rendering them all. */
export default memo(PickerResultRowBase);
