import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors the real layout: three KPI tiles, search + sort, two chip rows, rows. */
export default function RosterSkeleton() {
  return (
    <View className="gap-3 px-4 pt-1">
      <View className="flex-row gap-3">
        {[0, 1, 2].map((tile) => (
          <View key={tile} className="flex-1 gap-2 rounded-card bg-white px-3 py-3">
            <LISkeleton className="h-6 w-10" />
            <LISkeleton className="h-3 w-16" />
          </View>
        ))}
      </View>

      <View className="flex-row gap-2">
        <LISkeleton className="h-12 flex-1 rounded-2xl" />
        <LISkeleton className="h-12 w-28 rounded-2xl" />
      </View>

      <View className="flex-row gap-2">
        {['w-14', 'w-28', 'w-24', 'w-16'].map((width) => (
          <LISkeleton key={width} className={`h-9 rounded-pill ${width}`} />
        ))}
      </View>

      <View className="gap-2 pt-1">
        <LISkeleton className="h-3 w-24" />
        <View className="flex-row gap-2">
          {['w-20', 'w-24', 'w-16'].map((width) => (
            <LISkeleton key={width} className={`h-9 rounded-pill ${width}`} />
          ))}
        </View>
      </View>

      <View className="gap-2 pt-2">
        <LISkeleton className="h-3 w-16" />
        <View className="rounded-card bg-white">
          {[0, 1, 2, 3, 4].map((row) => (
            <View key={row} className="flex-row items-center gap-3 px-4 py-3">
              <LISkeleton className="h-9 w-9 rounded-pill" />
              <View className="flex-1 gap-2">
                <LISkeleton className="h-4 w-36" />
                <LISkeleton className="h-3 w-48" />
              </View>
              <LISkeleton className="h-3 w-10" />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
