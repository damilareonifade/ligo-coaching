import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors the real layout: a live card, then two attention rows. */
export default function CoachHomeSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <LISkeleton className="h-4 w-32" />
      <LISkeleton className="h-28 w-full rounded-card" />
      <LISkeleton className="h-4 w-28" />
      <LISkeleton className="h-20 w-full rounded-card" />
      <LISkeleton className="h-20 w-full rounded-card" />
    </View>
  );
}
