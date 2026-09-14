import { View } from 'react-native';

import { LIText } from '@/components/ui';

interface PickerNoticeProps {
  /** e.g. "Adding to Upper A · Upper/Lower 4×", or "Adding to this workout". */
  readonly text: string;
}

/**
 * A picker opened from three places lands in three different lists — a day of
 * a saved program, a day of the draft, or the workout running right now.
 * Saying which one, on the screen itself, is the difference between adding an
 * exercise and hoping you added it to the right place.
 */
export default function PickerNotice({ text }: PickerNoticeProps) {
  return (
    <View className="rounded-2xl bg-field px-4 py-3">
      <LIText
        size="caption"
        color="body"
        text={text}
        numberOfLines={1}
        className="font-geist-medium"
      />
    </View>
  );
}
