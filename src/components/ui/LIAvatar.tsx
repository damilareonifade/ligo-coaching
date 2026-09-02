import { Text, View } from 'react-native';

import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

import { LIImage } from './LIImage';

export interface LIAvatarProps {
  readonly name: string;
  readonly uri?: string | null;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

const sizeClass = {
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
} as const;

const textClass = {
  sm: 'text-caption',
  md: 'text-h5',
  lg: 'text-h3',
} as const;

export function LIAvatar({ name, uri, size = 'md', className }: LIAvatarProps) {
  if (uri) {
    return (
      <LIImage
        source={{ uri }}
        accessibilityLabel={name}
        className={cn('rounded-pill', sizeClass[size], className)}
      />
    );
  }

  return (
    <View
      className={cn(
        'items-center justify-center rounded-pill bg-light-teal',
        sizeClass[size],
        className,
      )}
      accessibilityLabel={name}
    >
      <Text className={cn('font-bold text-navy', textClass[size])}>{initials(name)}</Text>
    </View>
  );
}
