import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors the intro line, the five-row card, and the one-row card under it. */
export default function PermissionsSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <LISkeleton className="h-10 w-full" />

      <View className="gap-2">
        <LISkeleton className="h-3 w-28" />
        <View className="gap-4 rounded-card bg-surface p-4">
          {[0, 1, 2, 3, 4].map((row) => (
            <View key={row} className="flex-row items-center gap-3">
              <View className="flex-1 gap-2">
                <LISkeleton className="h-4 w-32" />
                <LISkeleton className="h-3 w-52" />
              </View>
              <LISkeleton className="h-7 w-12 rounded-pill" />
            </View>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <LISkeleton className="h-3 w-32" />
        <View className="gap-3 rounded-card bg-surface p-4">
          <View className="flex-row items-center gap-3">
            <View className="flex-1 gap-2">
              <LISkeleton className="h-4 w-40" />
              <LISkeleton className="h-3 w-56" />
            </View>
            <LISkeleton className="h-7 w-12 rounded-pill" />
          </View>
        </View>
      </View>
    </View>
  );
}
