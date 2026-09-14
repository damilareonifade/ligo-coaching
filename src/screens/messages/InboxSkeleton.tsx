import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

const ROWS = 5;

/** Mirrors the search field over one card of conversation rows. */
export default function InboxSkeleton() {
  return (
    <View className="px-4 pt-2">
      <View className="pb-3">
        <LISkeleton className="h-12 w-full rounded-2xl" />
      </View>

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
          <LISkeleton className="h-9 w-9 rounded-pill" />
          <View className="flex-1 gap-2">
            <LISkeleton className="h-4 w-36" />
            <LISkeleton className="h-3 w-52" />
            <LISkeleton className="h-3 w-20" />
          </View>
          <LISkeleton className="h-3 w-6" />
        </View>
      ))}
    </View>
  );
}
