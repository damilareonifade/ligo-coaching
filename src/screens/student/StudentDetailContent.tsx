import { ScrollView, View } from 'react-native';

import type { ApiProgram, ApiStudent, ApiVolumePoint } from '@/api/types';
import { LITable } from '@/components/LITable';
import { LIAvatar, LIBadge, LICard, LIText } from '@/components/ui';
import { formatPercent, formatSessionDay, formatWeight } from '@/lib/format';
import { useSettingsStore } from '@/store/settingsStore';

import StudentProgressChart from './StudentProgressChart';

interface StudentDetailContentProps {
  readonly student: ApiStudent;
  readonly program: ApiProgram | null;
  readonly volume: readonly ApiVolumePoint[];
  readonly volumeLoading: boolean;
}

const statusTone = {
  'on-track': 'success',
  'at-risk': 'warning',
  inactive: 'neutral',
} as const;

export default function StudentDetailContent({
  student,
  program,
  volume,
  volumeLoading,
}: StudentDetailContentProps) {
  const unit = useSettingsStore((state) => state.unit);

  return (
    <ScrollView contentContainerClassName="gap-3 px-4 pb-10 pt-2">
      <View className="flex-row items-center gap-3">
        <LIAvatar name={student.name} uri={student.avatarUrl} size="lg" />
        <View className="flex-1 gap-1">
          <LIText size="h2" color="primary" text={student.name} numberOfLines={1} />
          <LIText size="p" color="body" text={student.goal} />
        </View>
        <LIBadge tone={statusTone[student.status]} label={formatPercent(student.adherence)} />
      </View>

      {student.note ? (
        <LICard className="bg-violet-weak gap-1">
          <LIText size="caption" color="primary" text="Coach note" className="font-semibold" />
          <LIText size="p" color="body" text={student.note} />
        </LICard>
      ) : null}

      <View className="flex-row gap-3">
        <LICard className="flex-1 gap-1 p-3">
          <LIText size="caption" color="muted" text="Next session" />
          <LIText
            size="h5"
            color="primary"
            text={student.nextSessionAt ? formatSessionDay(student.nextSessionAt) : 'Not booked'}
          />
        </LICard>
        <LICard className="flex-1 gap-1 p-3">
          <LIText size="caption" color="muted" text="Last session" />
          <LIText
            size="h5"
            color="primary"
            text={student.lastSessionAt ? formatSessionDay(student.lastSessionAt) : 'Never'}
          />
        </LICard>
      </View>

      <StudentProgressChart points={volume} loading={volumeLoading} />

      <View className="gap-2">
        <LIText size="h4" color="primary" text={program ? program.name : 'No program assigned'} />
        {program ? (
          <>
            <LIText size="caption" color="muted" text={`${program.focus} · ${program.weeks} weeks`} />
            <LITable
              data={program.exercises}
              keyExtractor={(exercise) => exercise.id}
              emptyMessage="This program has no exercises yet."
              columns={[
                {
                  key: 'name',
                  header: 'Exercise',
                  flex: 2,
                  render: (exercise) => (
                    <LIText size="p" color="body" text={exercise.name} numberOfLines={1} />
                  ),
                },
                {
                  key: 'volume',
                  header: 'Sets × reps',
                  render: (exercise) => (
                    <LIText size="p" color="body" text={`${exercise.sets} × ${exercise.reps}`} />
                  ),
                },
                {
                  key: 'load',
                  header: 'Load',
                  render: (exercise) => (
                    <LIText size="p" color="body" text={formatWeight(exercise.targetWeightKg, unit)} />
                  ),
                },
              ]}
            />
          </>
        ) : (
          <LIText
            size="p"
            color="muted"
            text="Assign a program so this student has something to follow."
          />
        )}
      </View>
    </ScrollView>
  );
}
