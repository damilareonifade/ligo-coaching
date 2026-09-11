import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Mirrors the real feed: two group headings over cards of four and three rows. */
const GROUPS = [4, 3] as const;

function SkeletonRow({ first, last }: { readonly first: boolean; readonly last: boolean }) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-3 bg-white px-4 py-3',
        first && 'rounded-t-card',
        last && 'rounded-b-card',
        !first && 'border-t border-hairline',
      )}
    >
      <LISkeleton className="h-9 w-9 rounded-pill" />
      <View className="flex-1 gap-2">
        <LISkeleton className="h-4 w-44" />
        <LISkeleton className="h-3 w-56" />
      </View>
      <LISkeleton className="h-3 w-6" />
    </View>
  );
}

export default function ActivitySkeleton() {
  return (
    <View className="px-4 pt-2">
      {GROUPS.map((rows, groupIndex) => (
        <View key={groupIndex} className={cn(groupIndex > 0 && 'pt-5')}>
          <View className="pb-2">
            <LISkeleton className="h-3 w-32" />
          </View>
          {Array.from({ length: rows }, (_, index) => (
            <SkeletonRow key={index} first={index === 0} last={index === rows - 1} />
          ))}
        </View>
      ))}
      <View className="pt-5">
        <LISkeleton className="h-3 w-full" />
      </View>
    </View>
  );
}
