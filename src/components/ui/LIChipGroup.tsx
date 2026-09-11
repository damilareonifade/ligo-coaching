import { View } from 'react-native';

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
    </View>
  );
}
