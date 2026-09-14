import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** One routine card — the shape repeated down the whole screen. */
function RoutineCardSkeleton() {
  return (
    <View className="gap-3 rounded-card bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <LISkeleton className="h-3 w-20" />
        <LISkeleton className="h-6 w-16 rounded-pill" />
      </View>
      <LISkeleton className="h-6 w-52" />
      <LISkeleton className="h-3 w-40" />
      <View className="gap-2 pt-3">
        {[0, 1, 2].map((row) => (
          <View key={row} className="flex-row items-center justify-between">
            <LISkeleton className="h-4 w-32" />
            <LISkeleton className="h-3 w-12" />
          </View>
        ))}
      </View>
      <LISkeleton className="h-12 w-full rounded-pill" />
    </View>
  );
}

/** Mirrors TrainQuickActions + TrainRoutines + TrainProgramCard. */
export default function TrainSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <View className="flex-row gap-3">
        <LISkeleton className="h-12 flex-1 rounded-pill" />
        <LISkeleton className="h-12 flex-1 rounded-pill" />
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between px-1">
          <LISkeleton className="h-4 w-28" />
          <LISkeleton className="h-3 w-14" />
        </View>
        <RoutineCardSkeleton />
        <RoutineCardSkeleton />
      </View>

      <View className="gap-3 rounded-card bg-surface p-4">
        <View className="flex-row items-center justify-between">
          <LISkeleton className="h-4 w-28" />
          <LISkeleton className="h-3 w-14" />
        </View>
        <LISkeleton className="h-2 w-40" />
        <LISkeleton className="h-3 w-full" />
      </View>
    </View>
  );
}
