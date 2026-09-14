import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors the result rows only — the field and filters stay live while searching. */
export default function PickerSkeleton() {
  return (
    <View className="gap-3 px-4">
      <LISkeleton className="h-3 w-20" />
      {[0, 1, 2, 3, 4].map((row) => (
        <View key={row} className="flex-row items-center gap-3 rounded-card bg-surface px-4 py-3">
          <View className="flex-1 gap-2">
            <LISkeleton className="h-4 w-40" />
            <LISkeleton className="h-3 w-28" />
          </View>
          <LISkeleton className="h-6 w-20 rounded-pill" />
          <LISkeleton className="h-8 w-8 rounded-pill" />
        </View>
      ))}
    </View>
  );
}
