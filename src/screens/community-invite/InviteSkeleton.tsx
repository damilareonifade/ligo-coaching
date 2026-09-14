import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors the eyebrow, the invitation card, the two-part panel and the buttons. */
export default function InviteSkeleton() {
  return (
    <View className="gap-5 px-4 pt-3">
      <LISkeleton className="h-3 w-48" />

      <View className="gap-3 rounded-card border border-violet-line bg-violet-weak/40 p-4">
        <View className="flex-row items-center gap-3">
          <LISkeleton className="h-12 w-12 rounded-pill" />
          <View className="flex-1 gap-2">
            <LISkeleton className="h-5 w-40" />
            <LISkeleton className="h-3 w-24" />
          </View>
        </View>
        <LISkeleton className="h-3 w-full" />
        <LISkeleton className="h-3 w-2/3" />
      </View>

      <View className="overflow-hidden rounded-card border border-border">
        <View className="gap-2 bg-surface p-4">
          <LISkeleton className="h-3 w-52" />
          <LISkeleton className="h-4 w-full" />
          <LISkeleton className="h-4 w-3/4" />
          <LISkeleton className="h-4 w-2/3" />
        </View>
        <View className="gap-2 border-t border-border bg-background p-4">
          <LISkeleton className="h-3 w-40" />
          <LISkeleton className="h-4 w-full" />
          <LISkeleton className="h-4 w-3/4" />
          <LISkeleton className="h-4 w-2/3" />
        </View>
      </View>

      <View className="gap-2">
        <LISkeleton className="h-14 w-full rounded-2xl" />
        <LISkeleton className="h-14 w-full rounded-2xl" />
      </View>
    </View>
  );
}
