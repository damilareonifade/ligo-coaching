import { View } from 'react-native';

import { cn } from '@/lib/utils';

export interface LIRadioProps {
  readonly selected: boolean;
  readonly className?: string;
}

/**
 * The dot only, and deliberately not pressable: a radio's target is the whole
 * row it labels, so the row owns the `Pressable` and its accessibility state
 * and this draws the mark. A tappable dot beside a tappable row is two targets
 * for one choice, and the smaller one always wins the near-misses.
 */
export function LIRadio({ selected, className }: LIRadioProps) {
  return (
    <View
      className={cn(
        'h-5 w-5 items-center justify-center rounded-pill border-2',
        selected ? 'border-violet' : 'border-border-strong',
        className,
      )}
    >
      {selected ? <View className="h-2.5 w-2.5 rounded-pill bg-violet" /> : null}
    </View>
  );
}
