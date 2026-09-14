import { Image, type ImageProps } from 'expo-image';

import { cn } from '@/lib/utils';

export interface LIImageProps extends ImageProps {
  readonly className?: string;
}

/** Wraps expo-image so caching/transition policy is set in one place. */
export function LIImage({ className, transition = 200, ...props }: LIImageProps) {
  return (
    <Image
      className={cn('bg-surface-sunken', className)}
      transition={transition}
      cachePolicy="memory-disk"
      {...props}
    />
  );
}
