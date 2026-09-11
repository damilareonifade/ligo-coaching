import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

const ROWS = 3;

/** Mirrors an invite card over one card of membership rows. */
export default function CommunitySkeleton() {
  return (
    <View className="gap-5 px-4 pt-2">
      <View className="gap-2">
        <LISkeleton className="h-3 w-16" />
        <View className="gap-3 rounded-card border border-violet-line bg-violet-weak/40 p-4">
          <View className="flex-row items-center gap-3">
            <LISkeleton className="h-9 w-9 rounded-pill" />
            <View className="flex-1 gap-2">
              <LISkeleton className="h-4 w-32" />
              <LISkeleton className="h-3 w-20" />
            </View>
          </View>
          <LISkeleton className="h-3 w-full" />
          <LISkeleton className="h-11 w-full rounded-2xl" />
        </View>
      </View>

      <View className="gap-2">
        <LISkeleton className="h-3 w-20" />
        <View>
          {Array.from({ length: ROWS }, (_, index) => (
            <View
              key={index}
              className={cn(
                'gap-2 bg-white px-4 py-3',
                index === 0 && 'rounded-t-card',
                index === ROWS - 1 && 'rounded-b-card',
                index > 0 && 'border-t border-hairline',
              )}
            >
              <LISkeleton className="h-4 w-44" />
              <LISkeleton className="h-3 w-56" />
              <LISkeleton className="h-3 w-28" />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
