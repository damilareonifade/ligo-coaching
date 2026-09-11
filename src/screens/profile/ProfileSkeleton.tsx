import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors ProfileHeroCard + ProfileCoachSection + ProfileSettingsGroups. */
export default function ProfileSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <View className="gap-3 rounded-card bg-violet-weak p-4">
        <View className="flex-row items-center gap-3">
          <LISkeleton className="h-16 w-16 rounded-pill" />
          <View className="flex-1 gap-2">
            <LISkeleton className="h-5 w-40" />
            <LISkeleton className="h-3 w-52" />
          </View>
        </View>
        <View className="flex-row gap-2">
          {[0, 1, 2].map((tile) => (
            <View key={tile} className="flex-1 items-center gap-2 rounded-2xl bg-white p-3">
              <LISkeleton className="h-5 w-10" />
              <LISkeleton className="h-3 w-16" />
            </View>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <LISkeleton className="h-3 w-16" />
        <View className="rounded-card bg-white px-4 py-1">
          {[0, 1, 2, 3].map((row) => (
            <View key={row} className="flex-row items-center gap-3 py-3">
              {row === 0 ? <LISkeleton className="h-12 w-12 rounded-pill" /> : null}
              <View className="flex-1 gap-2">
                <LISkeleton className="h-4 w-32" />
                <LISkeleton className="h-3 w-44" />
              </View>
              <LISkeleton className="h-3 w-12" />
            </View>
          ))}
        </View>
      </View>

      {[0, 1].map((group) => (
        <View key={group} className="gap-2">
          <LISkeleton className="h-3 w-20" />
          <View className="rounded-card bg-white px-4 py-1">
            {[0, 1, 2].map((row) => (
              <View key={row} className="flex-row items-center gap-3 py-3">
                <View className="flex-1 gap-2">
                  <LISkeleton className="h-4 w-28" />
                  <LISkeleton className="h-3 w-40" />
                </View>
                <LISkeleton className="h-3 w-14" />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
