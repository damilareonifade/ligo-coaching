import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/utils';

export interface LICardProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly onPress?: () => void;
  /**
   * What the card does, for a screen reader. Without it the announcement is
   * whatever text happens to be inside — fine for a card that reads as a
   * sentence, useless for one that is a row of values.
   */
  readonly accessibilityLabel?: string;
  readonly testID?: string;
}

export function LICard({
  children,
  className,
  onPress,
  accessibilityLabel,
  testID,
}: LICardProps) {
  const classes = cn('rounded-card bg-surface p-4', className);

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className={cn(classes, 'active:opacity-80')}
        testID={testID}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={classes} testID={testID}>
      {children}
    </View>
  );
}
