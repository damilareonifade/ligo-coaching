import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors the result rows only — the field and filter stay live while searching. */
export default function FoodSearchSkeleton() {
  return (
    <View className="gap-3 px-4">
      {[0, 1, 2, 3].map((row) => (
        <View key={row} className="flex-row items-center gap-3 rounded-card bg-white p-4">
          <View className="flex-1 gap-2">
            <LISkeleton className="h-4 w-44" />
            <LISkeleton className="h-3 w-32" />
          </View>
          <LISkeleton className="h-4 w-8" />
          <LISkeleton className="h-6 w-20 rounded-pill" />
        </View>
      ))}
    </View>
  );
}
