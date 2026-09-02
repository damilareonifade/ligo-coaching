import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

export default function RosterSkeleton() {
  return (
    <View className="gap-3 px-4 pt-2">
      <View className="flex-row gap-3">
        {[0, 1, 2].map((card) => (
          <View key={card} className="flex-1 gap-2 rounded-card bg-sky p-3">
            <LISkeleton className="h-6 w-12" />
            <LISkeleton className="h-3 w-16" />
          </View>
        ))}
      </View>
      <LISkeleton className="h-12 w-full rounded-2xl" />
      {[0, 1, 2, 3].map((row) => (
        <View key={row} className="gap-3 rounded-card bg-white p-4">
          <View className="flex-row items-center gap-3">
            <LISkeleton className="h-12 w-12 rounded-pill" />
            <View className="flex-1 gap-2">
              <LISkeleton className="h-4 w-36" />
              <LISkeleton className="h-3 w-24" />
            </View>
          </View>
          <LISkeleton className="h-2 w-full" />
        </View>
      ))}
    </View>
  );
}
