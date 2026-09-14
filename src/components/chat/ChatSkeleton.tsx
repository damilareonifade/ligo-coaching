import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * Mirrors the header card, an alternating thread, and the composer row. Shared:
 * both seats render the same three parts, so they wait on the same shape.
 */
const BUBBLES = [
  { mine: false, width: 'w-56' },
  { mine: true, width: 'w-44' },
  { mine: false, width: 'w-64' },
  { mine: true, width: 'w-52' },
] as const;

export default function ChatSkeleton() {
  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-3 rounded-card bg-surface p-4 mx-4 mt-2">
        <LISkeleton className="h-12 w-12 rounded-pill" />
        <View className="flex-1 gap-2">
          <LISkeleton className="h-4 w-32" />
          <LISkeleton className="h-3 w-48" />
        </View>
        <LISkeleton className="h-6 w-24 rounded-pill" />
      </View>

      <View className="flex-1 gap-3 px-4 pt-3">
        {BUBBLES.map((bubble, index) => (
          <View key={index} className={cn('gap-1', bubble.mine ? 'items-end' : 'items-start')}>
            <LISkeleton className={cn('h-12 rounded-2xl', bubble.width)} />
            <LISkeleton className="h-3 w-16" />
          </View>
        ))}
      </View>

      <View className="flex-row items-center gap-2 border-t border-border px-4 py-3">
        <LISkeleton className="h-12 flex-1 rounded-pill" />
        <LISkeleton className="h-12 w-12 rounded-pill" />
      </View>
    </View>
  );
}
