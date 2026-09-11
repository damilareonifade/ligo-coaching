import { View } from 'react-native';

import { cn } from '@/lib/utils';
import { labelColorHex } from '@/theme/labelColors';

export interface LILabelDotProps {
  /** A `label-*` token name, resolved through `src/theme/labelColors.ts`. */
  readonly color: string;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

const sizeClass = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-6 w-6',
} as const;

/**
 * The colour half of a roster label. NativeWind cannot build a class name from
 * runtime data, so this is the one place a colour is passed as a raw value —
 * and it still comes from a token, never a hex written in a component.
 */
export function LILabelDot({ color, size = 'sm', className }: LILabelDotProps) {
  return (
    <View
      className={cn('rounded-pill', sizeClass[size], className)}
      style={{ backgroundColor: labelColorHex(color) }}
    />
  );
}
