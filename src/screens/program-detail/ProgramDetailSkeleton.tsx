import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Header card, day chips, four block rows, the add slot and the publish button. */
export default function ProgramDetailSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <View className="gap-2 rounded-card bg-white p-4">
        <LISkeleton className="h-5 w-56" />
        <LISkeleton className="h-3 w-44" />
      </View>

      <View className="flex-row gap-2">
        {[0, 1, 2, 3].map((chip) => (
          <LISkeleton key={chip} className="h-9 w-20 rounded-pill" />
        ))}
      </View>

      <View className="rounded-card bg-white">
        {[0, 1, 2, 3].map((row) => (
          <View key={row} className="flex-row items-center gap-3 px-4 py-3">
            <LISkeleton className="h-4 w-4" />
            <View className="flex-1 gap-2">
              <LISkeleton className="h-4 w-40" />
              <LISkeleton className="h-3 w-16" />
            </View>
            <LISkeleton className="h-3 w-12" />
          </View>
        ))}
      </View>

      <LISkeleton className="h-12 w-full rounded-2xl" />
      <LISkeleton className="h-12 w-full rounded-pill" />
    </View>
  );
}
