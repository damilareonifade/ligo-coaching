import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useSaveProgramMutation } from '@/api/coachPrograms';
import type { ApiProgramBlock, ApiProgramDetail } from '@/api/types';
import BuilderBlockRow, { type BlockPatch } from '@/components/builder/BuilderBlockRow';
import BuilderRoutineName from '@/components/builder/BuilderRoutineName';
import { LICard, LIText } from '@/components/ui';
import { setsLabel } from '@/lib/programs';
import { useUiStore } from '@/store/uiStore';
import { useThemeTokens } from '@/theme/tokens';

import ProgramAddExerciseButton from './ProgramAddExerciseButton';
import ProgramAssignButton from './ProgramAssignButton';
import ProgramRoutineChips from './ProgramRoutineChips';
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
  const tokens = useThemeTokens();
  // Which day is open is a reading position, not program data — it belongs to
  // the screen and resets when the coach leaves.
  const [selectedRoutineId, setSelectedDayId] = useState(program.routines[0]?.id ?? '');
  const day =
    program.routines.find((candidate) => candidate.id === selectedRoutineId) ?? program.routines[0] ?? null;

  const showToast = useUiStore((state) => state.showToast);
  const { mutate: saveProgram } = useSaveProgramMutation();

  /**
   * A saved program is written through the API, so every write is a round
   * trip — the rows commit once, when their fields close, rather than on each
   * keystroke. See `BuilderBlockRow`'s `onCommit`.
   */
  const writeBlocks = useCallback(
    (blocks: readonly ApiProgramBlock[]) => {
      if (!day) return;

      saveProgram(
        {
          id: program.id,
          name: program.name,
          note: program.note,
          kind: program.routines.length > 1 ? 'program' : 'routine',
          weeks: program.weeks,
          sessionsPerWeek: program.sessionsPerWeek,
          routines: program.routines.map((entry) =>
            entry.id === day.id ? { ...entry, blocks } : entry,
          ),
        },
        { onError: (error) => showToast(errorMessage(error), 'danger') },
      );
    },
    [day, program, saveProgram, showToast],
  );

  const handleCommit = useCallback(
    (blockId: string, patch: BlockPatch) => {
      if (!day) return;
      writeBlocks(
        day.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
      );
    },
    [day, writeBlocks],
  );

  const handleRenameDay = useCallback(
    (label: string) => {
      if (!day) return;

      saveProgram(
        {
          id: program.id,
          name: program.name,
          note: program.note,
          kind: program.routines.length > 1 ? 'program' : 'routine',
          weeks: program.weeks,
          sessionsPerWeek: program.sessionsPerWeek,
          routines: program.routines.map((entry) =>
            entry.id === day.id ? { ...entry, label } : entry,
          ),
        },
        { onError: (error) => showToast(errorMessage(error), 'danger') },
      );
    },
    [day, program, saveProgram, showToast],
  );

  const handleRemove = useCallback(
    (blockId: string) => {
      if (!day) return;
      writeBlocks(day.blocks.filter((block) => block.id !== blockId));
    },
    [day, writeBlocks],
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-4 pb-8 pt-2"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
      }
    >
      <ProgramDetailHeader program={program} />

      <ProgramRoutineChips
        routines={program.routines}
        selectedRoutineId={day?.id ?? ''}
        onSelect={setSelectedDayId}
      />

      {day && program.routines.length > 1 ? (
        <BuilderRoutineName
          key={day.id}
          label={day.name}
          fallback={`Day ${program.routines.indexOf(day) + 1}`}
          onRename={handleRenameDay}
        />
      ) : null}

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
              text={day.name.toUpperCase()}
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
                text="Nothing in this routine yet. Add the first exercise below."
                className="font-geist"
              />
            </LICard>
          ) : (
            <View className="gap-2">
              {day.blocks.map((block) => (
                <BuilderBlockRow
                  key={block.id}
                  block={block}
                  // The draft builder writes per keystroke; a saved program
                  // cannot, so nothing happens until the panel closes.
                  onChange={() => {}}
                  onCommit={handleCommit}
                  onRemove={handleRemove}
                />
              ))}
            </View>
          )}

          <ProgramAddExerciseButton programId={program.id} routineId={day.id} />
        </View>
      )}

      <ProgramAssignButton
        programId={program.id}
        assignedCount={program.assignedIds.length}
      />
      <ProgramPublishFooter program={program} />
    </ScrollView>
  );
}
