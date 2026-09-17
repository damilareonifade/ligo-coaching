import { cva } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

import { cn } from '@/lib/utils';

import { LIPressable } from './LIPressable';

const chip = cva('flex-row items-center gap-2 rounded-pill border px-4 py-2', {
  variants: {
    selected: {
      true: 'border-violet bg-violet',
      false: 'border-border bg-surface-sunken',
    },
  },
  defaultVariants: { selected: false },
});

const chipLabel = cva('text-caption font-semibold font-geist-medium', {
  variants: {
    selected: {
      true: 'text-surface',
      false: 'text-foreground-muted',
    },
  },
  defaultVariants: { selected: false },
});

export interface LIChipProps {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  /** Rendered before the label — a roster label's colour dot, say. */
  readonly leading?: ReactNode;
  readonly className?: string;
  readonly testID?: string;
}

/** Multi-select pill — several chips can be selected at once. */
export function LIChip({ label, selected, onPress, leading, className, testID }: LIChipProps) {
  return (
    <LIPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(chip({ selected }), className)}
      testID={testID}
    >
      {leading}
      <Text className={chipLabel({ selected })}>{label}</Text>
    </LIPressable>
  );
}
