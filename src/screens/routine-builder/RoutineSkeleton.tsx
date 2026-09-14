import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors the setup card, then the block rows the routine will fill in. */
export default function RoutineSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <View className="gap-2 rounded-card bg-white p-4">
        <LISkeleton className="h-3 w-16" />
        <LISkeleton className="h-11 w-full" />
      </View>

      <View className="flex-row items-center justify-between px-1">
        <LISkeleton className="h-3 w-24" />
        <LISkeleton className="h-3 w-16" />
      </View>

      <View className="gap-2">
        <LISkeleton className="h-16 w-full" />
        <LISkeleton className="h-16 w-full" />
        <LISkeleton className="h-16 w-full" />
      </View>

      <LISkeleton className="h-12 w-full" />
    </View>
  );
}
