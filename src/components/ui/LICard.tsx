import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/utils';

export interface LICardProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly onPress?: () => void;
  readonly testID?: string;
}

export function LICard({ children, className, onPress, testID }: LICardProps) {
  const classes = cn('rounded-card bg-white p-4', className);

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
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
