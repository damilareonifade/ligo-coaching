import { View } from 'react-native';

import { LIText } from '@/components/ui';

interface BoardFactsGridProps {
  readonly facts: readonly { readonly label: string; readonly value: string }[];
}

/**
 * What the board actually is, before the question of joining it: the metric,
 * the window, who can see it, and how often it moves.
 *
 * "Visible to" is a fact about the audience, in the same grid and the same
 * type as the rest, rather than a caveat underneath — the size of the room is
 * part of the offer, not a footnote to it.
 */
export default function BoardFactsGrid({ facts }: BoardFactsGridProps) {
  return (
    <View className="flex-row flex-wrap">
      {facts.map((fact) => (
        <View key={fact.label} className="w-1/2 gap-0.5 py-2">
          <LIText
            size="caption"
            color="muted"
            text={fact.label.toUpperCase()}
            className="font-geist-medium tracking-wide"
          />
          <LIText size="p" color="primary" text={fact.value} className="font-geist-medium" />
        </View>
      ))}
    </View>
  );
}
