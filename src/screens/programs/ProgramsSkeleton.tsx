import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors the library: a title, three program cards, then the new-program slot. */
export default function ProgramsSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <LISkeleton className="h-7 w-40" />

      {[0, 1, 2].map((row) => (
        <View key={row} className="gap-3 rounded-card bg-surface p-4">
          <View className="flex-row items-start gap-3">
            <View className="flex-1 gap-2">
              <LISkeleton className="h-4 w-40" />
              <LISkeleton className="h-3 w-52" />
            </View>
            <LISkeleton className="h-6 w-24 rounded-pill" />
          </View>
          <View className="h-px bg-border" />
          <View className="flex-row items-center gap-3">
            <LISkeleton className="h-9 w-24 rounded-pill" />
            <LISkeleton className="h-3 w-32" />
          </View>
        </View>
      ))}

      <LISkeleton className="h-12 w-full rounded-2xl" />
    </View>
  );
}
