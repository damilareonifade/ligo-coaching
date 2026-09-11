import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors HealthShareNotice plus three HealthSectionCards. */
export default function HealthSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <View className="gap-3 rounded-card bg-field p-4">
        <View className="flex-row items-start gap-3">
          <LISkeleton className="h-4 w-4 rounded-pill" />
          <LISkeleton className="h-10 flex-1" />
        </View>
        <LISkeleton className="h-9 w-32 self-end rounded-pill" />
      </View>

      {[2, 1, 2].map((rowCount, section) => (
        <View key={section} className="gap-2">
          <LISkeleton className="h-3 w-40" />
          <View className="rounded-card bg-white px-4 py-1">
            {Array.from({ length: rowCount }, (_, row) => (
              <View key={row} className="flex-row items-center gap-3 py-3">
                <LISkeleton className="h-3 w-[108px]" />
                <LISkeleton className="h-4 flex-1" />
              </View>
            ))}
          </View>
          <LISkeleton className="h-3 w-56" />
        </View>
      ))}
    </View>
  );
}
