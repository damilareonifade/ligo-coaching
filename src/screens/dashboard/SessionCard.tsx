import { useCallback } from 'react';
import { View } from 'react-native';

import type { ApiSession } from '@/api/types';
import { LIAvatar, LIBadge, LIButton, LICard, LIProgressBar, LIText } from '@/components/ui';
import { formatTime } from '@/lib/format';

interface SessionCardProps {
  readonly session: ApiSession;
  readonly onLogSet: (session: ApiSession) => void;
  readonly onOpenStudent: (studentId: string) => void;
  readonly logging: boolean;
}

const statusTone = {
  completed: 'success',
  scheduled: 'violet',
  missed: 'danger',
} as const;

const statusLabel = {
  completed: 'Done',
  scheduled: 'Scheduled',
  missed: 'Missed',
} as const;

export default function SessionCard({
  session,
  onLogSet,
  onOpenStudent,
  logging,
}: SessionCardProps) {
  const handleOpen = useCallback(() => onOpenStudent(session.studentId), [onOpenStudent, session.studentId]);
  const handleLog = useCallback(() => onLogSet(session), [onLogSet, session]);

  const isDone = session.status === 'completed';

  return (
    <LICard className="gap-3" onPress={handleOpen} testID={`session-${session.id}`}>
      <View className="flex-row items-center gap-3">
        <LIAvatar name={session.studentName} />
        <View className="flex-1 gap-0.5">
          <LIText size="h5" color="primary" text={session.studentName} numberOfLines={1} />
          <LIText
            size="caption"
            color="muted"
            text={`${formatTime(session.scheduledAt)} · ${session.programName}`}
            numberOfLines={1}
          />
        </View>
        <LIBadge tone={statusTone[session.status]} label={statusLabel[session.status]} />
      </View>

      <View className="gap-1.5">
        <LIProgressBar
          value={session.totalSets === 0 ? 0 : session.completedSets / session.totalSets}
          tone={isDone ? 'success' : 'violet'}
          label={`${session.completedSets} of ${session.totalSets} sets complete`}
        />
        <LIText
          size="caption"
          color="muted"
          text={`${session.completedSets}/${session.totalSets} sets logged`}
        />
      </View>

      {!isDone ? (
        <LIButton
          title="Log a set"
          onPress={handleLog}
          variant="violet"
          size="sm"
          loading={logging}
          fullWidth
        />
      ) : null}
    </LICard>
  );
}
