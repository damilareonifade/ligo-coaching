import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors the settings screen: hero, notification list, three groups. */
export default function CoachSettingsSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2" testID="coach-settings-skeleton">
      <View className="gap-4 rounded-card bg-violet-weak p-4">
        <View className="flex-row items-center gap-3">
          <LISkeleton className="h-16 w-16 rounded-pill" />
          <View className="flex-1 gap-2">
            <LISkeleton className="h-6 w-36" />
            <LISkeleton className="h-4 w-56" />
          </View>
        </View>
        <LISkeleton className="h-16 w-full rounded-2xl" />
      </View>

      <View className="gap-2">
        <LISkeleton className="h-4 w-28" />
        <LISkeleton className="h-72 w-full rounded-card" />
      </View>

      <View className="gap-2">
        <LISkeleton className="h-4 w-24" />
        <LISkeleton className="h-32 w-full rounded-card" />
      </View>

      <View className="gap-2">
        <LISkeleton className="h-4 w-20" />
        <LISkeleton className="h-32 w-full rounded-card" />
      </View>
    </View>
  );
}
