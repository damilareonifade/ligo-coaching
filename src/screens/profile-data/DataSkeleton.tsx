import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors the hero, export, import, access and danger cards. */
export default function DataSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <View className="gap-3 rounded-card bg-violet-weak p-4">
        <LISkeleton className="h-5 w-52" />
        <LISkeleton className="h-3 w-full" />
        {[0, 1].map((row) => (
          <View key={row} className="flex-row gap-2">
            {[0, 1, 2].map((tile) => (
              <View key={tile} className="flex-1 items-center gap-2 rounded-2xl bg-white p-3">
                <LISkeleton className="h-4 w-12" />
                <LISkeleton className="h-3 w-16" />
              </View>
            ))}
          </View>
        ))}
      </View>

      <View className="gap-3 rounded-card bg-white p-4">
        <LISkeleton className="h-3 w-28" />
        <LISkeleton className="h-11 w-full rounded-pill" />
        <LISkeleton className="h-3 w-full" />
        <View className="flex-row items-center gap-3 border-t border-hairline pt-3">
          <View className="flex-1 gap-2">
            <LISkeleton className="h-4 w-56" />
            <LISkeleton className="h-3 w-44" />
          </View>
          <LISkeleton className="h-[26px] w-11 rounded-pill" />
        </View>
        <LISkeleton className="h-12 w-full rounded-pill" />
        <LISkeleton className="h-3 w-40 self-center" />
      </View>

      <View className="gap-3 rounded-card bg-white p-4">
        <LISkeleton className="h-4 w-48" />
        <LISkeleton className="h-3 w-full" />
        {[0, 1, 2, 3].map((row) => (
          <View key={row} className="flex-row items-center gap-3 py-1">
            <LISkeleton className="h-9 w-9 rounded-2xl" />
            <View className="flex-1 gap-2">
              <LISkeleton className="h-4 w-28" />
              <LISkeleton className="h-3 w-36" />
            </View>
          </View>
        ))}
      </View>

      <View className="gap-3 rounded-card bg-white p-4">
        <LISkeleton className="h-3 w-44" />
        {[0, 1, 2].map((row) => (
          <View key={row} className="flex-row items-center gap-3">
            <LISkeleton className="h-4 w-28 flex-1" />
            <LISkeleton className="h-6 w-24 rounded-pill" />
          </View>
        ))}
        <LISkeleton className="h-12 w-full rounded-pill" />
      </View>

      <View className="gap-3 rounded-card border border-hairline bg-white p-4">
        <LISkeleton className="h-4 w-32" />
        <LISkeleton className="h-12 w-full" />
        <LISkeleton className="h-12 w-full rounded-pill" />
      </View>
    </View>
  );
}
