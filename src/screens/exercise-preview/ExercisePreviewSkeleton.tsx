import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors the animation, the title, and the two cards under it. */
export default function ExercisePreviewSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <LISkeleton className="aspect-square w-full rounded-card" />
      <View className="gap-2">
        <LISkeleton className="h-6 w-56" />
        <LISkeleton className="h-3 w-40" />
      </View>
      <View className="gap-2">
        <LISkeleton className="h-3 w-20" />
        <LISkeleton className="h-24 w-full rounded-card" />
      </View>
    </View>
  );
}
