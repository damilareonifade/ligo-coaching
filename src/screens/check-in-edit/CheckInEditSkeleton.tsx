import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors the header card, five field rows, the note, photo row and buttons. */
export default function CheckInEditSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <View className="gap-2 rounded-card bg-surface p-4">
        <LISkeleton className="h-5 w-40" />
        <LISkeleton className="h-3 w-full" />
      </View>

      <View className="gap-3 rounded-card bg-surface p-4">
        {[0, 1, 2, 3, 4].map((row) => (
          <View key={row} className="flex-row items-center gap-3">
            <LISkeleton className="h-4 w-24 flex-1" />
            <LISkeleton className="h-12 w-[88px] rounded-2xl" />
            <LISkeleton className="h-3 w-8" />
          </View>
        ))}
      </View>

      <View className="gap-2 rounded-card bg-surface p-4">
        <LISkeleton className="h-3 w-12" />
        <LISkeleton className="h-[84px] w-full rounded-2xl" />
      </View>

      <LISkeleton className="h-14 w-full rounded-card" />
      <LISkeleton className="h-12 w-full rounded-pill" />
      <LISkeleton className="h-12 w-full rounded-pill" />
    </View>
  );
}
