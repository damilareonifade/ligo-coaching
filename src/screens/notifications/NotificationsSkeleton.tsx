import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors a group heading and the card of rows under it. */
export default function NotificationsSkeleton() {
  return (
    <View className="gap-5 px-4 pt-2">
      {[0, 1].map((group) => (
        <View key={group} className="gap-2">
          <LISkeleton className="h-3 w-24" />
          <View className="gap-4 rounded-card bg-surface p-4">
            {[0, 1, 2].map((row) => (
              <View key={row} className="flex-row items-center gap-3">
                <LISkeleton className="h-9 w-9 rounded-pill" />
                <View className="flex-1 gap-2">
                  <LISkeleton className="h-4 w-44" />
                  <LISkeleton className="h-3 w-full" />
                </View>
                <LISkeleton className="h-3 w-6" />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
