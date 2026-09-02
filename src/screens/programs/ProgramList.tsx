import { useCallback } from 'react';
import { View } from 'react-native';

import type { ApiProgram } from '@/api/types';
import { LIBadge, LICard, LIEmptyState, LIList, LIText } from '@/components/ui';

interface ProgramListProps {
  readonly programs: readonly ApiProgram[];
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

export default function ProgramList({ programs, refreshing, onRefresh }: ProgramListProps) {
  const renderItem = useCallback(
    ({ item }: { item: ApiProgram }) => (
      <LICard className="gap-2">
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1 gap-0.5">
            <LIText size="h5" color="primary" text={item.name} numberOfLines={1} />
            <LIText size="caption" color="muted" text={item.focus} />
          </View>
          <LIBadge tone="accent" label={`${item.weeks} wks`} />
        </View>
        <LIText
          size="caption"
          color="muted"
          text={`${item.exercises.length} exercises · ${item.assignedStudentIds.length} assigned`}
        />
      </LICard>
    ),
    [],
  );

  return (
    <LIList
      data={[...programs]}
      keyExtractor={(program) => program.id}
      renderItem={renderItem}
      contentContainerClassName="px-4 pb-8 pt-2"
      ItemSeparatorComponent={() => <View className="h-3" />}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={
        <LIEmptyState
          title="No programs yet"
          message="Build a program once and assign it to as many students as you like."
        />
      }
    />
  );
}
