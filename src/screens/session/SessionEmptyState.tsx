import { View } from 'react-native';

import { LIText } from '@/components/ui';

/**
 * An empty workout has no plan behind it, so the screen has to say what to do
 * next — the add-exercise button sits directly below this.
 */
export default function SessionEmptyState() {
  return (
    <View className="items-center gap-1 py-8" testID="session-empty-state">
      <LIText
        size="h5"
        color="primary"
        text="Nothing logged yet"
        className="font-geist-semibold"
      />
      <LIText
        size="caption"
        color="muted"
        text="Add your first exercise below. Weights and reps are yours to set."
        className="text-center font-geist"
      />
    </View>
  );
}
