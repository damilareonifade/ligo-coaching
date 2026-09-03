import { View } from 'react-native';

import { LIText } from '@/components/ui';

/**
 * The promise the feed exists to keep. Said at the foot of the list rather than
 * in a dialog: a coach reads it once, and every access row above it is the
 * evidence.
 */
export default function ActivityNote() {
  return (
    <View className="pt-5">
      <LIText
        size="caption"
        color="muted"
        text="Permission changes are always announced. You never lose access silently."
        className="px-1 font-geist"
      />
    </View>
  );
}
