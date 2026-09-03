import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors DashboardHeader + three SessionCards. */
export default function DashboardSkeleton() {
  return (
    <View className="gap-3 px-4 pt-2">
      <View className="flex-row items-center justify-between pb-2">
        <View className="gap-2">
          <LISkeleton className="h-4 w-28" />
          <LISkeleton className="h-8 w-44" />
          <LISkeleton className="h-4 w-52" />
        </View>
        <LISkeleton className="h-16 w-16 rounded-pill" />
      </View>

      {[0, 1, 2].map((row) => (
        <View key={row} className="gap-3 rounded-card bg-white p-4">
          <View className="flex-row items-center gap-3">
            <LISkeleton className="h-12 w-12 rounded-pill" />
            <View className="flex-1 gap-2">
              <LISkeleton className="h-4 w-32" />
              <LISkeleton className="h-3 w-40" />
            </View>
          </View>
          <LISkeleton className="h-2 w-full" />
          <LISkeleton className="h-9 w-full rounded-pill" />
        </View>
      ))}
    </View>
  );
}
