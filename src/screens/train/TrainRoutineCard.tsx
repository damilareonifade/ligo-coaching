import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useCallback } from 'react';
import { Alert, View } from 'react-native';

import type { ApiRoutine } from '@/api/types';
import { LIButton, LICard, LIText } from '@/components/ui';
import { lastDoneLabel } from '@/lib/rotation';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

import TrainRoutineUpdate from './TrainRoutineUpdate';

interface TrainRoutineCardProps {
  readonly routine: ApiRoutine;
  readonly onStart: (routineId: string) => void;
  readonly onDelete: (routineId: string) => void;
  readonly onDecideUpdate: (routineId: string, accept: boolean) => void;
  readonly starting: boolean;
  readonly deciding: boolean;
  readonly disabled: boolean;
}

/**
 * One routine, as a card the client can judge without opening it — where it
 * came from, what is in it, and one button to run it.
 *
 * Every routine carries this treatment rather than one being promoted to a
 * "next up" slot above the rest: the app does not know better than the lifter
 * which one today is. The coach's current assignment still leads the list and
 * is the one ringed in violet.
 */
export default function TrainRoutineCard({
  routine,
  onStart,
  onDelete,
  onDecideUpdate,
  starting,
  deciding,
  disabled,
}: TrainRoutineCardProps) {
  const router = useRouter();
  // Every routine here is the client's own copy — a coach's is one they were
  // handed, not one they are borrowing. Both are theirs to change.
  const fromCoach = routine.owner === 'coach';

  const open = useCallback(() => {
    router.push({ pathname: '/routines/[id]', params: { id: routine.id } });
  }, [router, routine.id]);

  /**
   * A native alert rather than `LIModal`: this is a destructive confirm, and
   * it has to appear. The bottom sheet does not reliably present here — see
   * the workout screen, where the set editor was rebuilt inline for the same
   * reason.
   *
   * Removing a copy of a coach's routine is not deleting their routine, and
   * the wording has to say so — otherwise it reads as a far bigger act.
   */
  const confirmDelete = useCallback(() => {
    Alert.alert(
      fromCoach ? `Remove ${routine.name}?` : `Delete ${routine.name}?`,
      fromCoach
        ? 'This removes your copy. Your coach keeps theirs, and workouts you already logged stay.'
        : 'This removes the routine. Workouts you already logged from it stay.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: fromCoach ? 'Remove' : 'Delete',
          style: 'destructive',
          onPress: () => onDelete(routine.id),
        },
      ],
    );
  }, [fromCoach, routine.name, routine.id, onDelete]);

  return (
    <LICard
      className={cn('gap-3', routine.isCurrent && 'border border-violet-line')}
      testID={`routine-card-${routine.id}`}
    >
      <View className="flex-row items-center justify-between gap-2">
        <LIText
          size="caption"
          color="muted"
          text={
            routine.isCurrent
              ? `${routine.sourceLabel} · up next`
              : `${routine.sourceLabel} · ${lastDoneLabel(routine.lastCompletedAt).toLowerCase()}`
          }
          numberOfLines={1}
          className="flex-1 font-geist-medium"
        />
        <LIButton
          title=""
          onPress={confirmDelete}
          variant="ghost"
          size="sm"
          disabled={disabled}
          icon={<Trash2 color={tokens.muted} size={18} />}
          accessibilityLabel={
            fromCoach ? `Remove your copy of ${routine.name}` : `Delete ${routine.name}`
          }
          className="h-9 w-9 gap-0 px-0"
          testID={`routine-delete-${routine.id}`}
        />
      </View>

      <View className="gap-1">
        <LIText size="h3" color="primary" text={routine.name} className="font-geist-semibold" />
        {routine.note ? (
          <LIText size="caption" color="muted" text={routine.note} className="font-geist" />
        ) : null}
      </View>

      {routine.preview.length > 0 ? (
        <View className="gap-2 border-t border-hairline pt-3">
          {routine.preview.map((row) => (
            <View key={row.name} className="flex-row items-center justify-between gap-3">
              <LIText
                size="p"
                color="body"
                text={row.name}
                numberOfLines={1}
                className="flex-1 font-geist"
              />
              <LIText size="caption" color="muted" text={row.scheme} className="font-geist-medium" />
            </View>
          ))}
        </View>
      ) : null}

      {routine.pendingUpdate ? (
        <TrainRoutineUpdate
          routineId={routine.id}
          update={routine.pendingUpdate}
          diverged={routine.diverged}
          onDecide={onDecideUpdate}
          deciding={deciding}
        />
      ) : null}

      <View className="flex-row gap-2">
        <LIButton
          title="Edit"
          onPress={open}
          variant="outline"
          disabled={disabled}
          testID={`routine-edit-${routine.id}`}
        />

        <LIButton
          title="Start workout"
          onPress={() => onStart(routine.id)}
          loading={starting}
          disabled={disabled}
          className="flex-1"
          testID={`routine-start-${routine.id}`}
        />
      </View>
    </LICard>
  );
}
