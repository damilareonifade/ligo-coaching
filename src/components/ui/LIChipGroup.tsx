import { ScrollView, View } from 'react-native';

import { cn } from '@/lib/utils';

import { LIChip } from './LIChip';
import { LIText } from './LIText';

export interface LIChipOption {
  readonly label: string;
  readonly value: string;
}

export interface LIChipGroupProps {
  /** Rendered above the row, upper-cased — "MUSCLE", "EQUIPMENT", "TRACKS". */
  readonly label?: string;
  readonly options: readonly LIChipOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
  /**
   * Scroll on one line instead of wrapping.
   *
   * The default is to wrap, so nothing can hide off the right edge — right
   * when the options are a short fixed set somebody wrote. It is wrong when
   * they come from data: the catalogue has ten muscle groups and nearly thirty
   * pieces of equipment, and wrapping those is eight lines of chrome above a
   * list somebody is trying to read.
   */
  readonly scrollable?: boolean;
  readonly testID?: string;
}

/**
 * Single-select row of `LIChip`s. `LIChip` on its own is a multi-select pill;
 * this is the one-of-many case — a muscle, a week count, a filter — and wraps
 * rather than scrolling so no option can hide off the right edge.
 */
export function LIChipGroup({
  label,
  options,
  value,
  onChange,
  className,
  scrollable = false,
  testID,
}: LIChipGroupProps) {
  return (
    <View className={cn('gap-2', className)} testID={testID}>
      {label ? (
        <LIText
          size="caption"
          color="muted"
          text={label.toUpperCase()}
          className="font-geist-medium uppercase tracking-wide"
        />
      ) : null}
      {scrollable ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // Negative margin and matching padding so the row bleeds to the
          // screen's edge — a chip half-cut at the margin is the only thing
          // that tells you there are more.
          className="-mx-4"
          contentContainerClassName="flex-row gap-2 px-4"
        >
          {options.map((option) => (
            <LIChip
              key={option.value}
              label={option.label}
              selected={option.value === value}
              onPress={() => onChange(option.value)}
              testID={testID ? `${testID}-${option.value}` : undefined}
            />
          ))}
        </ScrollView>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {options.map((option) => (
            <LIChip
              key={option.value}
              label={option.label}
              selected={option.value === value}
              onPress={() => onChange(option.value)}
              testID={testID ? `${testID}-${option.value}` : undefined}
            />
          ))}
        </View>
      )}
    </View>
  );
}
