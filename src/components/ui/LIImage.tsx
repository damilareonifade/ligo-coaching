import { Image, type ImageProps } from 'expo-image';
import { cssInterop } from 'nativewind';

import { cn } from '@/lib/utils';

/**
 * NativeWind only understands `className` on React Native's own components.
 * `expo-image`'s `Image` is third-party, so without this it receives a
 * `className` prop it has never heard of, ignores it, and renders with no
 * width or height at all — invisible, silently, everywhere.
 *
 * That was the state of every image in this app: avatar photos via `LIAvatar`
 * and exercise animations both. It looked like the images were failing to
 * load, which sent the investigation to the CDN, the bucket and the URL in
 * turn — all of which were fine.
 *
 * Registered here rather than in a setup file because this is the only module
 * that renders an `expo-image`, and a registration far from its component is
 * one nobody finds when it is missing.
 */
cssInterop(Image, { className: 'style' });

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
