import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors the review: header, label card, chart card, two domain cards. */
export default function ReviewSkeleton() {
  return (
    <View className="gap-3 px-4 pt-2" testID="review-skeleton">
      <View className="gap-4 rounded-card bg-surface p-4">
        <View className="flex-row items-center gap-3">
          <LISkeleton className="h-16 w-16 rounded-pill" />
          <View className="flex-1 gap-2">
            <LISkeleton className="h-6 w-40" />
            <LISkeleton className="h-4 w-52" />
          </View>
        </View>
        <LISkeleton className="h-12 w-full rounded-2xl" />
      </View>

      <View className="gap-3 rounded-card bg-surface p-4">
        <LISkeleton className="h-5 w-20" />
        <View className="flex-row gap-2">
          <LISkeleton className="h-9 w-28 rounded-pill" />
          <LISkeleton className="h-9 w-24 rounded-pill" />
          <LISkeleton className="h-9 w-20 rounded-pill" />
        </View>
        <LISkeleton className="h-8 w-full" />
      </View>

      <View className="gap-3 rounded-card bg-surface p-4">
        <LISkeleton className="h-5 w-44" />
        <LISkeleton className="h-36 w-full" />
      </View>

      <LISkeleton className="h-40 w-full rounded-card" />
      <LISkeleton className="h-32 w-full rounded-card" />
    </View>
  );
}
