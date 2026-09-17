import { Pressable, View } from 'react-native';

import { cn } from '@/lib/utils';

export interface WelcomeDotsProps {
  readonly count: number;
  readonly index: number;
  readonly onSelect: (index: number) => void;
}

/**
 * Where you are in the carousel, and a way to go somewhere else in it.
 *
 * Tappable rather than decorative — the slides advance on their own until
 * someone touches them, and a person who wants the fourth one now should not
 * have to swipe three times or wait fifteen seconds for it.
 */
export function WelcomeDots({ count, index, onSelect }: WelcomeDotsProps) {
  return (
    <View className="flex-row gap-2" testID="welcome-dots">
      {Array.from({ length: count }, (_, dot) => {
        const active = dot === index;
        return (
          <Pressable
            key={dot}
            onPress={() => onSelect(dot)}
            accessibilityRole="button"
            accessibilityLabel={`Slide ${dot + 1} of ${count}`}
            accessibilityState={{ selected: active }}
            // The dot is 8px; the touch target around it is not.
            hitSlop={10}
            testID={`welcome-dot-${dot}`}
          >
            {/* Foreground rather than violet: the kicker pill above already
                spends the accent, and two violets on one screen arguing over
                which is the highlight is how the palette rules get broken. */}
            <View
              className={cn(
                'h-2 rounded-pill',
                active ? 'w-6 bg-foreground' : 'w-2 bg-border-strong',
              )}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
