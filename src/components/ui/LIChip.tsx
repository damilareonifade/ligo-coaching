import { cva } from 'class-variance-authority';
import { Pressable, Text } from 'react-native';

import { cn } from '@/lib/utils';

const chip = cva('rounded-pill border px-4 py-2', {
  variants: {
    selected: {
      true: 'border-violet bg-violet',
      false: 'border-hairline bg-field',
    },
  },
  defaultVariants: { selected: false },
});

const chipLabel = cva('text-caption font-semibold font-geist-medium', {
  variants: {
    selected: {
      true: 'text-white',
      false: 'text-dark-gray',
    },
  },
  defaultVariants: { selected: false },
});

export interface LIChipProps {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly className?: string;
  readonly testID?: string;
}

/** Multi-select pill — several chips can be selected at once. */
export function LIChip({ label, selected, onPress, className, testID }: LIChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(chip({ selected }), 'active:opacity-80', className)}
      testID={testID}
    >
      <Text className={chipLabel({ selected })}>{label}</Text>
    </Pressable>
  );
}
