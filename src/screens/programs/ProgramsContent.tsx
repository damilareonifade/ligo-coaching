import { useMemo } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import type { ApiProgramSummary, ApiRosterClient } from '@/api/types';
import { LIEmptyState, LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

import ProgramCard from './ProgramCard';
import ProgramsNewButton from './ProgramsNewButton';
import ProgramsNote from './ProgramsNote';

interface ProgramsContentProps {
  readonly programs: readonly ApiProgramSummary[];
  /** The roster, for the assigned faces — programs store roster ids, not names. */
  readonly clients: readonly ApiRosterClient[];
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

/**
 * A ScrollView, not `LIList`: a library is a handful of programs a coach wrote
 * themselves, wrapped in a new-program slot and a note about publishing that
 * would otherwise have to become list headers and footers.
 */
export default function ProgramsContent({
  programs,
  clients,
  refreshing,
  onRefresh,
}: ProgramsContentProps) {
  // One pass over the roster instead of one lookup per card per render.
  const nameById = useMemo(
    () => new Map(clients.map((entry) => [entry.id, entry.name])),
    [clients],
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-4 pb-8 pt-2"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
      }
    >
      <LIText size="h2" color="primary" text="Programs" className="font-geist-bold" />

      {programs.length === 0 ? (
        <LIEmptyState
          title="No programs yet"
          message="Build one once, assign it to as many clients as you like, and edit it without touching a week they already trained."
        />
      ) : (
        <View className="gap-3">
          {programs.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              assignedNames={program.assignedIds
                .map((id) => nameById.get(id))
                .filter((name): name is string => typeof name === 'string')}
            />
          ))}
        </View>
      )}

      <ProgramsNewButton />
      <ProgramsNote />
    </ScrollView>
  );
}
