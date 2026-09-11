import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import type { ApiProgramDetail } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import { setsLabel } from '@/lib/programs';
import { tokens } from '@/theme/tokens';

import ProgramAddExerciseButton from './ProgramAddExerciseButton';
import ProgramBlockRow from './ProgramBlockRow';
import ProgramDayChips from './ProgramDayChips';
import ProgramDetailHeader from './ProgramDetailHeader';
import ProgramPublishFooter from './ProgramPublishFooter';

interface ProgramDetailContentProps {
  readonly program: ApiProgramDetail;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

export default function ProgramDetailContent({
  program,
  refreshing,
  onRefresh,
}: ProgramDetailContentProps) {
  // Which day is open is a reading position, not program data — it belongs to
  // the screen and resets when the coach leaves.
  const [selectedDayId, setSelectedDayId] = useState(program.days[0]?.id ?? '');
  const day =
    program.days.find((candidate) => candidate.id === selectedDayId) ?? program.days[0] ?? null;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-4 pb-8 pt-2"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
      }
    >
      <ProgramDetailHeader program={program} />

      <ProgramDayChips
        days={program.days}
        selectedDayId={day?.id ?? ''}
        onSelect={setSelectedDayId}
      />

      {day === null ? (
        <LICard>
          <LIText
            size="caption"
            color="muted"
            text="This program has no days yet."
            className="font-geist"
          />
        </LICard>
      ) : (
        <View className="gap-3">
          <View className="flex-row items-center justify-between px-1">
            <LIText
              size="caption"
              color="muted"
              text={day.label.toUpperCase()}
              className="font-geist-medium uppercase tracking-wide"
            />
            <LIText
              size="caption"
              color="muted"
              text={setsLabel(day.blocks)}
              className="font-geist-medium"
            />
          </View>

          {day.blocks.length === 0 ? (
            <LICard>
              <LIText
                size="caption"
                color="muted"
                text="Nothing on this day yet. Add the first exercise below."
                className="font-geist"
              />
            </LICard>
          ) : (
            <View>
              {day.blocks.map((block, index) => (
                <ProgramBlockRow
                  key={block.id}
                  block={block}
                  first={index === 0}
                  last={index === day.blocks.length - 1}
                />
              ))}
            </View>
          )}

          <ProgramAddExerciseButton programId={program.id} dayId={day.id} />
        </View>
      )}

      <ProgramPublishFooter program={program} />
    </ScrollView>
  );
}
