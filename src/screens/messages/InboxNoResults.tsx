import { View } from 'react-native';

import { LIButton, LIText } from '@/components/ui';

interface InboxNoResultsProps {
  /** Already trimmed. */
  readonly query: string;
  readonly onClear: () => void;
}

/**
 * The search matched nothing — which is not the same as having no
 * conversations, so this never claims the inbox is empty. It says what was
 * searched for and hands back the full list.
 */
export default function InboxNoResults({ query, onClear }: InboxNoResultsProps) {
  return (
    <View className="mt-2 items-center gap-3 rounded-card border border-dashed border-border-strong px-6 py-8">
      <LIText
        size="p"
        color="primary"
        text={`No name or message matches “${query}”.`}
        className="text-center font-geist-medium"
      />
      <LIText
        size="caption"
        color="muted"
        text="Every conversation is still here — this is the search, not the inbox."
        className="text-center font-geist"
      />
      <LIButton
        title="Clear search"
        onPress={onClear}
        variant="outline"
        size="sm"
        testID="inbox-clear-search"
      />
    </View>
  );
}
