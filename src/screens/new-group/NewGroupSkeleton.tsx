import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

const ROWS = 6;

/** Mirrors the eyebrow, the name field, the roster list and the summary card. */
export default function NewGroupSkeleton() {
  return (
    <View className="gap-5 px-4 pt-3">
      <LISkeleton className="h-3 w-52" />

      <View className="gap-2">
        <LISkeleton className="h-3 w-24" />
        <LISkeleton className="h-12 w-full rounded-2xl" />
        <LISkeleton className="h-3 w-64" />
      </View>

      <View className="gap-2">
        <LISkeleton className="h-3 w-36" />
        <View className="rounded-card bg-white px-4">
          {Array.from({ length: ROWS }, (_, index) => (
            <View
              key={index}
              className={cn(
                'flex-row items-center gap-3 py-3',
                index > 0 && 'border-t border-hairline',
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

      <View className="gap-3 rounded-card border border-violet-line bg-violet-weak/40 p-4">
        <LISkeleton className="h-4 w-56" />
        <LISkeleton className="h-12 w-full rounded-2xl" />
        <LISkeleton className="h-3 w-full" />
      </View>
    </View>
  );
}
