import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

export default function StudentSkeleton() {
  return (
    <View className="gap-3 px-4 pt-2">
      <View className="flex-row items-center gap-3">
        <LISkeleton className="h-16 w-16 rounded-pill" />
        <View className="flex-1 gap-2">
          <LISkeleton className="h-7 w-40" />
          <LISkeleton className="h-4 w-52" />
        </View>
      </View>
      <View className="flex-row gap-3">
        <LISkeleton className="h-20 flex-1 rounded-card" />
        <LISkeleton className="h-20 flex-1 rounded-card" />
      </View>
      <LISkeleton className="h-52 w-full rounded-card" />
      <LISkeleton className="h-40 w-full rounded-card" />
    </View>
  );
}
