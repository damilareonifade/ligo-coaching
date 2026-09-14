import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback } from 'react';
import { Alert, Pressable, View } from 'react-native';

import type { ApiRoutine, ApiWeeklyProgress } from '@/api/types';
import { LIButton, LICard, LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

import TrainRoutineCard from './TrainRoutineCard';

interface TrainRoutinesProps {
  readonly routines: readonly ApiRoutine[];
  readonly week: ApiWeeklyProgress;
  readonly onStart: (routineId: string) => void;
  readonly onDelete: (routineId: string) => void;
  readonly onDeleteAll: () => void;
  readonly onDecideUpdate: (routineId: string, accept: boolean) => void;
  /** The routine whose update is being answered, if any. */
  readonly decidingId: string | null;
  /** The routine currently starting, if any — only its own card should spin. */
  readonly startingId: string | null;
  readonly disabled: boolean;
}

/**
 * Every routine the client can run, each as a full card. The list *is* the
 * screen — there is no promoted slot above it.
 */
export default function TrainRoutines({
  routines,
  week,
  onStart,
  onDelete,
  onDeleteAll,
  onDecideUpdate,
  decidingId,
  startingId,
  disabled,
}: TrainRoutinesProps) {
  const router = useRouter();
  const build = useCallback(() => router.push('/routines/new'), [router]);

  // Only the client's own are theirs to clear, so the offer is only there
  // when they have some — and it says how many, because "all" is vague when
  // a coach's routines are sitting in the same list.
  const ownCount = routines.filter((routine) => routine.owner === 'you').length;

  const confirmDeleteAll = useCallback(() => {
    Alert.alert(
      `Delete all ${ownCount} of your routines?`,
      'Your coach’s routines stay. Workouts you already logged stay too.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete all', style: 'destructive', onPress: onDeleteAll },
      ],
    );
  }, [ownCount, onDeleteAll]);

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between px-1">
        <LIText size="h5" color="primary" text="Your routines" className="font-geist-semibold" />
        {/* A target, never a schedule: it says how much has been done, and
            has nothing to say about which days or what was "missed". */}
        <LIText
          size="caption"
          color={week.done >= week.target ? 'success' : 'muted'}
          text={`${week.done} of ${week.target} this week`}
          className="font-geist-medium"
        />
      </View>

      {routines.length === 0 ? (
        <LICard>
          <LIText
            size="caption"
            color="muted"
            text="No routines yet. Build one below, or ask your coach for a plan."
            className="font-geist"
          />
        </LICard>
      ) : (
        routines.map((routine) => (
          <TrainRoutineCard
            key={routine.id}
            routine={routine}
            onStart={onStart}
            onDelete={onDelete}
            onDecideUpdate={onDecideUpdate}
            starting={startingId === routine.id}
            deciding={decidingId === routine.id}
            disabled={disabled}
          />
        ))
      )}

      <Pressable
        onPress={build}
        accessibilityRole="button"
        className="h-12 w-full flex-row items-center justify-center gap-2 rounded-card border border-dashed border-violet-line active:opacity-70"
        testID="train-build-routine"
      >
        <Plus color={tokens.violet} size={18} />
        <LIText size="p" color="accent" text="Build a routine" className="font-geist-medium" />
      </Pressable>

      {ownCount > 0 ? (
        <LIButton
          title="Delete all my routines"
          onPress={confirmDeleteAll}
          variant="ghost"
          disabled={disabled}
          fullWidth
          labelClassName="text-danger font-geist-medium"
          testID="train-delete-all-routines"
        />
      ) : null}
    </View>
  );
}
