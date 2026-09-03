import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors TodayPlanCard + TodayMacros + TodayCoachCard + TodayWeek. */
export default function ClientTodaySkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <View className="gap-3 rounded-card bg-violet-weak p-4">
        <LISkeleton className="h-3 w-24" />
        <LISkeleton className="h-6 w-52" />
        <LISkeleton className="h-3 w-64" />
        <LISkeleton className="h-12 w-full rounded-pill" />
      </View>

      <View className="flex-row gap-3">
        {[0, 1].map((card) => (
          <View key={card} className="flex-1 gap-2 rounded-card bg-white p-4">
            <LISkeleton className="h-3 w-16" />
            <LISkeleton className="h-7 w-24" />
            <LISkeleton className="h-2 w-full" />
          </View>
        ))}
      </View>

      <View className="gap-3 rounded-card bg-white p-4">
        <LISkeleton className="h-3 w-16" />
        <View className="flex-row items-center gap-3">
          <LISkeleton className="h-12 w-12 rounded-pill" />
          <View className="flex-1 gap-2">
            <LISkeleton className="h-4 w-32" />
            <LISkeleton className="h-3 w-44" />
          </View>
        </View>
      </View>

      <View className="gap-2">
        <LISkeleton className="h-3 w-20" />
        <View className="gap-3 rounded-card bg-white p-4">
          {[0, 1, 2, 3, 4].map((row) => (
            <View key={row} className="flex-row items-center gap-3">
              <LISkeleton className="h-3 w-10" />
              <View className="flex-1 gap-2">
                <LISkeleton className="h-4 w-24" />
                <LISkeleton className="h-3 w-36" />
              </View>
              <LISkeleton className="h-6 w-16 rounded-pill" />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
