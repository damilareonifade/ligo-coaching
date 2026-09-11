import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors SessionStats + three SessionExerciseCards + the finish block. */
export default function SessionSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <View className="flex-row gap-3">
        {[0, 1].map((card) => (
          <View key={card} className="flex-1 gap-2 rounded-card bg-white p-4">
            <LISkeleton className="h-3 w-16" />
            <LISkeleton className="h-7 w-24" />
          </View>
        ))}
      </View>

      {[0, 1, 2].map((card) => (
        <View key={card} className="gap-3 rounded-card bg-white p-4">
          <View className="flex-row items-start gap-3">
            <View className="flex-1 gap-2">
              <LISkeleton className="h-4 w-32" />
              <LISkeleton className="h-3 w-40" />
            </View>
            <LISkeleton className="h-3 w-8" />
          </View>
          {[0, 1, 2].map((row) => (
            <View key={row} className="flex-row items-center gap-2">
              <LISkeleton className="h-3 w-4" />
              <LISkeleton className="h-7 w-20 rounded-pill" />
              <LISkeleton className="h-7 w-20 rounded-pill" />
              <View className="flex-1" />
              <LISkeleton className="h-9 w-9 rounded-pill" />
            </View>
          ))}
        </View>
      ))}

      <LISkeleton className="h-12 w-full rounded-card" />
      <LISkeleton className="h-12 w-full rounded-pill" />
    </View>
  );
}
