import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors FoodSummaryCard + FoodSearchEntry + FoodLoggedList + FoodQuickAdd. */
export default function FoodSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <View className="flex-row items-center gap-4 rounded-card bg-surface p-4">
        <LISkeleton className="h-[86px] w-[86px] rounded-pill" />
        <View className="flex-1 gap-3">
          {[0, 1, 2].map((row) => (
            <View key={row} className="gap-1">
              <LISkeleton className="h-3 w-full" />
              <LISkeleton className="h-2 w-full" />
            </View>
          ))}
        </View>
      </View>

      <LISkeleton className="h-11 w-full rounded-2xl" />

      <View className="gap-2">
        <LISkeleton className="h-3 w-24" />
        <View className="gap-3 rounded-card bg-surface p-4">
          {[0, 1, 2].map((row) => (
            <View key={row} className="flex-row items-center gap-3">
              <View className="flex-1 gap-2">
                <LISkeleton className="h-4 w-40" />
                <LISkeleton className="h-3 w-28" />
              </View>
              <LISkeleton className="h-4 w-8" />
              <LISkeleton className="h-6 w-14 rounded-pill" />
            </View>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <LISkeleton className="h-3 w-20" />
        <View className="gap-3 rounded-card bg-surface p-4">
          {[0, 1, 2, 3].map((row) => (
            <View key={row} className="flex-row items-center gap-3">
              <LISkeleton className="h-9 w-9 rounded-pill" />
              <View className="flex-1 gap-2">
                <LISkeleton className="h-4 w-32" />
                <LISkeleton className="h-3 w-20" />
              </View>
              <LISkeleton className="h-4 w-8" />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
