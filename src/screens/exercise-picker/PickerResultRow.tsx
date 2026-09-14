import { useRouter } from 'expo-router';
import { Dumbbell, Plus } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { Pressable, View } from 'react-native';

import type { ApiExerciseOption } from '@/api/types';
import { LIBadge, LIImage, LIText } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

interface PickerResultRowProps {
  readonly option: ApiExerciseOption;
  readonly onAdd: (option: ApiExerciseOption) => void;
  readonly disabled: boolean;
}

function PickerResultRowBase({ option, onAdd, disabled }: PickerResultRowProps) {
  const tokens = useThemeTokens();
  const router = useRouter();
  const add = useCallback(() => onAdd(option), [onAdd, option]);

  /**
   * Two gestures, because they are two decisions. The row opens the movement
   * — which is what you tap when you are not sure what it is — and the `+`
   * adds it, which is what you tap when you are.
   */
  const preview = useCallback(() => {
    router.push({
      pathname: '/exercise/[name]',
      params: { name: option.name, exerciseId: option.id },
    });
  }, [option.id, option.name, router]);

  return (
    <Pressable
      onPress={preview}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${option.name}, ${option.meta}. Opens how to do it.`}
      accessibilityState={{ disabled }}
      className="flex-row items-center gap-3 rounded-card bg-surface p-3 active:opacity-70"
      testID={`picker-result-${option.id}`}
    >
      {option.gifUrl ? (
        <LIImage
          source={{ uri: option.gifUrl }}
          className="h-16 w-16 rounded-xl"
          contentFit="cover"
          // Still, not animating. Forty of these playing at once in a scrolling
          // list costs battery and memory for a thumbnail nobody is studying —
          // the animation is what the detail screen is for.
          autoplay={false}
          testID={`picker-thumb-${option.id}`}
        />
      ) : (
        // No animation stored yet — they are fetched the first time somebody
        // opens an exercise, so most of the catalogue starts without one. A
        // tile of the same size keeps every row the same shape; leaving it out
        // made the list sit unevenly and read as half-loaded.
        <View
          className="h-16 w-16 items-center justify-center rounded-xl bg-surface-sunken"
          testID={`picker-thumb-placeholder-${option.id}`}
        >
          <Dumbbell color={tokens['foreground-subtle']} size={22} />
        </View>
      )}

      <View className="flex-1 gap-0.5">
        <LIText
          size="p"
          color="primary"
          text={option.name}
          // Two lines, because the catalogue's names are long — "Cable Side
          // Bend Crunch" was being cut mid-word at one line.
          numberOfLines={2}
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

      {/* Only "Yours" survives as a badge. Compound and Accessory used to be
          filters, and once they stopped being one they were two words of
          noise on every row competing with the name. */}
      {option.tag === 'Yours' ? (
        <LIBadge tone="violet" label="Yours" labelClassName="font-geist-medium" />
      ) : null}

      {/* Its own target now. The row used to add on any tap, which left
          nowhere to look something up without committing to it. */}
      <Pressable
        onPress={add}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Add ${option.name}`}
        accessibilityState={{ disabled }}
        hitSlop={8}
        className="h-8 w-8 items-center justify-center rounded-pill border border-violet active:opacity-60"
        testID={`picker-add-${option.id}`}
      >
        <Plus color={tokens.violet} size={16} />
      </Pressable>
    </Pressable>
  );
}

/** Rows recycle inside FlashList — memo keeps a scroll from re-rendering them all. */
export default memo(PickerResultRowBase);
