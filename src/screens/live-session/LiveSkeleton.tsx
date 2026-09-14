import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors the live screen: header, notice, three exercise cards. */
export default function LiveSkeleton() {
  return (
    <View className="gap-3 px-4 pt-2" testID="live-skeleton">
      <View className="gap-2 rounded-card bg-surface p-4">
        <LISkeleton className="h-5 w-52" />
        <LISkeleton className="h-4 w-64" />
      </View>
      <LISkeleton className="h-14 w-full rounded-card" />
      <LISkeleton className="h-52 w-full rounded-card" />
      <LISkeleton className="h-44 w-full rounded-card" />
      <LISkeleton className="h-44 w-full rounded-card" />
    </View>
  );
}
