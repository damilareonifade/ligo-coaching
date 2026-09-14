import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors the real layout: intro line, the labels card, the new-label card. */
export default function LabelsSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <View className="gap-1">
        <LISkeleton className="h-3 w-full" />
        <LISkeleton className="h-3 w-2/3" />
      </View>

      <View className="gap-2">
        <LISkeleton className="h-3 w-20" />
        <View className="rounded-card bg-surface">
          {[0, 1, 2, 3, 4].map((row) => (
            <View key={row} className="flex-row items-center gap-3 px-4 py-3">
              <LISkeleton className="h-6 w-6 rounded-pill" />
              <View className="flex-1 gap-2">
                <LISkeleton className="h-4 w-28" />
                <LISkeleton className="h-3 w-16" />
              </View>
              <LISkeleton className="h-6 w-6 rounded-pill" />
              <LISkeleton className="h-6 w-6 rounded-pill" />
            </View>
          ))}
        </View>
        <LISkeleton className="h-3 w-3/4" />
      </View>

      <View className="gap-2">
        <LISkeleton className="h-3 w-24" />
        <View className="gap-4 rounded-card bg-surface p-4">
          <LISkeleton className="h-12 w-full rounded-2xl" />
          <LISkeleton className="h-11 w-2/3 rounded-pill" />
          <LISkeleton className="h-9 w-32 rounded-pill" />
          <LISkeleton className="h-12 w-full rounded-pill" />
        </View>
      </View>
    </View>
  );
}
