import { View } from 'react-native';

import { LIText } from '@/components/ui';

interface PickerNoticeProps {
  /** e.g. "Upper A" */
  readonly dayLabel: string;
  /** e.g. "Upper/Lower 4×" */
  readonly programName: string;
}

/**
 * A picker opened from two places lands in two different days — saying which
 * one, on the screen itself, is the difference between adding an exercise and
 * hoping you added it to the right day.
 */
export default function PickerNotice({ dayLabel, programName }: PickerNoticeProps) {
  return (
    <View className="rounded-2xl bg-field px-4 py-3">
      <LIText
        size="caption"
        color="body"
        text={`Adding to ${dayLabel} · ${programName}`}
        numberOfLines={1}
        className="font-geist-medium"
      />
    </View>
  );
}
