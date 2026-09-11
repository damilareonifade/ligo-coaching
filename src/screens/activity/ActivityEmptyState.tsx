import { View } from 'react-native';

import { LIText } from '@/components/ui';

/**
 * An empty feed is not a failure — it is a quiet week. It says so, and it still
 * repeats the one guarantee, because "nothing here" is exactly when a coach
 * would wonder whether something was withheld.
 */
export default function ActivityEmptyState() {
  return (
    <View className="mt-2 items-center gap-2 rounded-card border border-dashed border-hairline-strong px-6 py-10">
      <LIText
        size="p"
        color="primary"
        text="Nothing has happened yet."
        className="text-center font-geist-medium"
      />
      <LIText
        size="caption"
        color="muted"
        text="Sessions, check-ins, replies and permission changes all land here as your clients make them."
        className="text-center font-geist"
      />
    </View>
  );
}
