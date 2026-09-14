import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { LIButton, LIText } from '@/components/ui';

/**
 * No conversations at all — a coach with an empty roster, or one nobody has
 * written to yet. That is a beginning, not a problem, so it points at the
 * roster rather than apologising.
 */
export default function InboxEmptyState() {
  const router = useRouter();
  const openRoster = useCallback(() => router.push('/roster'), [router]);

  return (
    <View className="mt-2 items-center gap-3 rounded-card border border-dashed border-border-strong px-6 py-10">
      <LIText
        size="p"
        color="primary"
        text="No conversations yet."
        className="text-center font-geist-medium"
      />
      <LIText
        size="caption"
        color="muted"
        text="Every client on your roster can message you, and you can message them — whatever else they have chosen to share."
        className="text-center font-geist"
      />
      <LIButton
        title="Open your roster"
        onPress={openRoster}
        variant="outline"
        size="sm"
        testID="inbox-open-roster"
      />
    </View>
  );
}
