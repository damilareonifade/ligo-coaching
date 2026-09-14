import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

const METRICS = 5;
const ROWS = 4;

/** Mirrors the name field, the metric list, the window chips and the roster. */
export default function NewBoardSkeleton() {
  return (
    <View className="gap-5 px-4 pt-3">
      <LISkeleton className="h-3 w-52" />

      <View className="gap-2">
        <LISkeleton className="h-3 w-32" />
        <LISkeleton className="h-12 w-full rounded-2xl" />
      </View>

      <View className="gap-2">
        <LISkeleton className="h-3 w-28" />
        <View className="rounded-card bg-surface px-4">
          {Array.from({ length: METRICS }, (_, index) => (
            <View
              key={index}
              className={cn(
                'flex-row items-center gap-3 py-3',
                index > 0 && 'border-t border-border',
              )}
            >
              <LISkeleton className="h-5 w-5 rounded-pill" />
              <View className="flex-1 gap-2">
                <LISkeleton className="h-4 w-36" />
                <LISkeleton className="h-3 w-44" />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <LISkeleton className="h-3 w-24" />
        <View className="flex-row gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <LISkeleton key={index} className="h-9 w-24 rounded-pill" />
          ))}
        </View>
      </View>

      <View className="gap-2">
        <LISkeleton className="h-3 w-36" />
        <View className="rounded-card bg-surface px-4">
          {Array.from({ length: ROWS }, (_, index) => (
            <View
              key={index}
              className={cn(
                'flex-row items-center gap-3 py-3',
                index > 0 && 'border-t border-border',
              )}
            >
              <LISkeleton className="h-6 w-6 rounded-md" />
              <LISkeleton className="h-9 w-9 rounded-pill" />
              <View className="flex-1 gap-2">
                <LISkeleton className="h-4 w-32" />
                <LISkeleton className="h-3 w-48" />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
