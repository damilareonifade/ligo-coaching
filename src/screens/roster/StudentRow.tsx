import { memo, useCallback } from 'react';
import { View } from 'react-native';

import type { ApiStudent } from '@/api/types';
import { LIAvatar, LIBadge, LICard, LIProgressBar, LIText } from '@/components/ui';
import { formatPercent, formatSessionDay } from '@/lib/format';

interface StudentRowProps {
  readonly student: ApiStudent;
  readonly onPress: (studentId: string) => void;
}

const statusTone = {
  'on-track': 'success',
  'at-risk': 'warning',
  inactive: 'neutral',
} as const;

const statusLabel = {
  'on-track': 'On track',
  'at-risk': 'At risk',
  inactive: 'Inactive',
} as const;

/** Memoised: FlashList recycles rows, and this one re-renders on every scroll tick otherwise. */
function StudentRow({ student, onPress }: StudentRowProps) {
  const handlePress = useCallback(() => onPress(student.id), [onPress, student.id]);

  return (
    <LICard className="gap-3 bg-white" onPress={handlePress} testID={`student-${student.id}`}>
      <View className="flex-row items-center gap-3">
        <LIAvatar name={student.name} uri={student.avatarUrl} />
        <View className="flex-1 gap-0.5">
          <LIText size="h5" color="primary" text={student.name} numberOfLines={1} />
          <LIText size="caption" color="muted" text={student.goal} numberOfLines={1} />
        </View>
        <LIBadge tone={statusTone[student.status]} label={statusLabel[student.status]} />
      </View>

      <View className="gap-1.5">
        <LIProgressBar
          value={student.adherence / 100}
          tone={student.status === 'at-risk' ? 'danger' : 'accent'}
          label={`${formatPercent(student.adherence)} adherence`}
        />
        <View className="flex-row justify-between">
          <LIText
            size="caption"
            color="muted"
            text={`${formatPercent(student.adherence)} adherence`}
          />
          <LIText
            size="caption"
            color="muted"
            text={
              student.nextSessionAt
                ? `Next: ${formatSessionDay(student.nextSessionAt)}`
                : 'No session booked'
            }
          />
        </View>
      </View>
    </LICard>
  );
}

export default memo(StudentRow);
