import { View } from 'react-native';

import { LIButton, LIText } from '@/components/ui';

interface RosterNoResultsProps {
  /** Already trimmed. Empty means the filters alone emptied the list. */
  readonly query: string;
  readonly onClear: () => void;
}

/**
 * Filters matched nobody — which is not the same as having no clients, so this
 * never claims the roster is empty. It says what was asked for and offers the
 * way back.
 */
export default function RosterNoResults({ query, onClear }: RosterNoResultsProps) {
  return (
    <View className="mt-2 items-center gap-3 rounded-card border border-dashed border-hairline-strong px-6 py-8">
      <LIText
        size="p"
        color="primary"
        text={
          query.length > 0
            ? `No one on your roster matches “${query}”.`
            : 'No one on your roster matches these filters.'
        }
        className="text-center font-geist-medium"
      />
      <LIText
        size="caption"
        color="muted"
        text="Everyone is still here — this is the filter, not the roster."
        className="text-center font-geist"
      />
      <LIButton
        title="Clear search and filters"
        onPress={onClear}
        variant="outline"
        size="sm"
        testID="roster-clear-filters"
      />
    </View>
  );
}
