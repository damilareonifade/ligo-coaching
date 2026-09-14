import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/**
 * Mirrors ProgressVolumeCard + ProgressRecords + ProgressBodyWeight +
 * ProgressMonthly + ProgressPrivacyNote.
 */
export default function ProgressSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <View className="gap-3 rounded-card bg-surface p-4">
        <View className="flex-row items-start justify-between">
          <View className="gap-2">
            <LISkeleton className="h-3 w-24" />
            <LISkeleton className="h-7 w-36" />
          </View>
          <LISkeleton className="h-4 w-12" />
        </View>
        <LISkeleton className="h-[140px] w-full" />
        <LISkeleton className="h-3 w-full" />
      </View>

      <View className="gap-3 rounded-card bg-surface p-4">
        <LISkeleton className="h-4 w-36" />
        {[0, 1, 2].map((row) => (
          <View key={row} className="flex-row items-center gap-3">
            <LISkeleton className="h-9 w-9 rounded-2xl" />
            <View className="flex-1 gap-2">
              <LISkeleton className="h-4 w-28" />
              <LISkeleton className="h-3 w-20" />
            </View>
            <LISkeleton className="h-3 w-16" />
          </View>
        ))}
      </View>

      <View className="gap-3 rounded-card bg-surface p-4">
        <View className="flex-row items-center justify-between">
          <LISkeleton className="h-3 w-24" />
          <LISkeleton className="h-5 w-20" />
        </View>
        <LISkeleton className="h-24 w-full" />
        <LISkeleton className="h-3 w-full" />
      </View>

      <View className="gap-3 rounded-card bg-surface p-4">
        <View className="flex-row items-center gap-2">
          <LISkeleton className="h-5 w-5 rounded-pill" />
          <LISkeleton className="h-4 w-40" />
          <LISkeleton className="h-6 w-20 rounded-pill" />
        </View>
        {[0, 1, 2].map((row) => (
          <View key={row} className="flex-row items-center gap-3">
            <LISkeleton className="h-3 w-24 flex-1" />
            <LISkeleton className="h-3 w-14" />
            <LISkeleton className="h-6 w-14 rounded-pill" />
          </View>
        ))}
        <LISkeleton className="h-3 w-full" />
      </View>

      <View className="flex-row items-start gap-3 rounded-card border border-dashed border-border-strong p-4">
        <LISkeleton className="h-4 w-4 rounded-pill" />
        <LISkeleton className="h-8 flex-1" />
      </View>
    </View>
  );
}
