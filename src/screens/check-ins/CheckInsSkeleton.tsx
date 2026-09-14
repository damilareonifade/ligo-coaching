import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors the stat row, the log button, two entry cards and the coach toggle. */
export default function CheckInsSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <View className="flex-row gap-3">
        {[0, 1, 2].map((stat) => (
          <View key={stat} className="flex-1 items-center gap-2 rounded-card bg-surface px-2 py-3">
            <LISkeleton className="h-5 w-16" />
            <LISkeleton className="h-3 w-20" />
          </View>
        ))}
      </View>

      <LISkeleton className="h-12 w-full rounded-pill" />

      {[0, 1].map((card) => (
        <View key={card} className="gap-3 rounded-card bg-surface p-4">
          <View className="flex-row items-center gap-3">
            <LISkeleton className="h-4 w-32 flex-1" />
            <LISkeleton className="h-4 w-16" />
          </View>
          <View className="flex-row flex-wrap gap-y-2">
            {[0, 1, 2, 3].map((cell) => (
              <View key={cell} className="w-1/2 pr-3">
                <LISkeleton className="h-3 w-full" />
              </View>
            ))}
          </View>
          <LISkeleton className="h-3 w-full" />
          <View className="flex-row items-center gap-2 border-t border-border pt-3">
            <LISkeleton className="h-6 w-12 rounded-pill" />
            <LISkeleton className="h-3 w-32 flex-1" />
            <LISkeleton className="h-9 w-16 rounded-pill" />
          </View>
        </View>
      ))}

      <View className="flex-row items-center gap-3 rounded-card bg-surface p-4">
        <View className="flex-1 gap-2">
          <LISkeleton className="h-4 w-48" />
          <LISkeleton className="h-3 w-40" />
        </View>
        <LISkeleton className="h-[26px] w-11 rounded-pill" />
      </View>
    </View>
  );
}
