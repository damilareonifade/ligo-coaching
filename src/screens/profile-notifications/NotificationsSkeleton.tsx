import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors three NotificationGroupCards plus QuietHoursCard. */
export default function NotificationsSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      {[3, 4, 1].map((rowCount, group) => (
        <View key={group} className="gap-2">
          <LISkeleton className="h-3 w-20" />
          <View className="rounded-card bg-surface px-4 py-1">
            {Array.from({ length: rowCount }, (_, row) => (
              <View key={row} className="flex-row items-center gap-3 py-3">
                <View className="flex-1 gap-2">
                  <LISkeleton className="h-4 w-32" />
                  <LISkeleton className="h-3 w-48" />
                </View>
                <LISkeleton className="h-[26px] w-11 rounded-pill" />
              </View>
            ))}
          </View>
          <LISkeleton className="h-3 w-56" />
        </View>
      ))}

      <View className="flex-row items-center gap-3 rounded-card bg-surface p-4">
        <View className="flex-1 gap-2">
          <LISkeleton className="h-4 w-28" />
          <LISkeleton className="h-3 w-52" />
        </View>
        <LISkeleton className="h-3 w-24" />
      </View>
    </View>
  );
}
