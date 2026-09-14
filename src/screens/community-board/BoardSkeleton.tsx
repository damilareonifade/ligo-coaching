import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

const ROWS = 6;

/** Mirrors the header card, its three stats, and the ranked rows beneath. */
export default function BoardSkeleton() {
  return (
    <View className="gap-3 px-4 pt-2">
      <View className="gap-3 rounded-card bg-surface p-4">
        <View className="flex-row items-start gap-2">
          <View className="flex-1 gap-2">
            <LISkeleton className="h-5 w-52" />
            <LISkeleton className="h-3 w-64" />
          </View>
          <LISkeleton className="h-6 w-20 rounded-pill" />
        </View>

        <View className="flex-row gap-2 border-t border-border pt-3">
          {Array.from({ length: 3 }, (_, index) => (
            <View key={index} className="flex-1 gap-1">
              <LISkeleton className="h-4 w-20" />
              <LISkeleton className="h-3 w-16" />
            </View>
          ))}
        </View>
      </View>

      <View>
        {Array.from({ length: ROWS }, (_, index) => (
          <View
            key={index}
            className={cn(
              'flex-row items-center gap-3 bg-surface px-4 py-3',
              index === 0 && 'rounded-t-card',
              index === ROWS - 1 && 'rounded-b-card',
              index > 0 && 'border-t border-border',
            )}
          >
            <LISkeleton className="h-4 w-4" />
            <LISkeleton className="h-9 w-9 rounded-pill" />
            <View className="flex-1 gap-2">
              <LISkeleton className="h-4 w-28" />
              <LISkeleton className="h-3 w-20" />
            </View>
            <View className="items-end gap-2">
              <LISkeleton className="h-4 w-20" />
              <LISkeleton className="h-3 w-8" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
