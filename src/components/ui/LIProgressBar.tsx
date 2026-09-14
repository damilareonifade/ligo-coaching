import { View } from 'react-native';

import { cn } from '@/lib/utils';

export interface LIProgressBarProps {
  /** 0–1. Values outside the range are clamped. */
  readonly value: number;
  readonly tone?: 'accent' | 'violet' | 'success' | 'danger';
  readonly className?: string;
  readonly label?: string;
}

const fillClass = {
  accent: 'bg-violet',
  violet: 'bg-violet',
  success: 'bg-success',
  danger: 'bg-danger',
} as const;

export function LIProgressBar({ value, tone = 'accent', className, label }: LIProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 1);

  return (
    <View
      className={cn('h-2 w-full overflow-hidden rounded-pill bg-surface-sunken', className)}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View className={cn('h-full rounded-pill', fillClass[tone])} style={{ width: `${clamped * 100}%` }} />
    </View>
  );
}
