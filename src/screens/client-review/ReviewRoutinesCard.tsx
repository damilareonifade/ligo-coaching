import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, View } from 'react-native';

import type { ApiRoutineInstance, ApiWeeklyProgress } from '@/api/types';
import { LIBadge, LICard, LISkeleton, LIText } from '@/components/ui';
import { lastDoneLabel, nextInRotation } from '@/lib/rotation';
import { useThemeTokens } from '@/theme/tokens';

interface ReviewRoutinesCardProps {
  readonly clientId: string;
  readonly routines: readonly ApiRoutineInstance[];
  readonly week: ApiWeeklyProgress;
  readonly loading: boolean;
}

interface RoutineRowProps {
  readonly clientId: string;
  readonly routine: ApiRoutineInstance;
  readonly isNext: boolean;
}

/**
 * Mirrors `RoutineRow`: a name over its exercise count, and the chevron.
 *
 * It replaced the word "Loading…", which told a coach that something was
 * happening without telling them what was about to be there — and moved the
 * card's height twice, once when the text appeared and again when the rows
 * did.
 */
function RoutineRowSkeleton() {
  return (
    <View className="gap-3" testID="review-routines-skeleton">
      {[0, 1].map((row) => (
        <View key={row} className="flex-row items-center gap-3">
          <View className="flex-1 gap-2">
            <LISkeleton className="h-4 w-36" />
            <LISkeleton className="h-3 w-48" />
          </View>
          <LISkeleton className="h-4 w-4 rounded-pill" />
        </View>
      ))}
    </View>
  );
}

function RoutineRow({ clientId, routine, isNext }: RoutineRowProps) {
  const tokens = useThemeTokens();
  const router = useRouter();

  const open = useCallback(() => {
    router.push({
      pathname: '/student/[id]/routines/[routineId]',
      params: { id: clientId, routineId: routine.id },
    });
  }, [router, clientId, routine.id]);

  const lifts = routine.blocks.length;

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${routine.name} for this client`}
      className="flex-row items-center gap-3 active:opacity-70"
      testID={`review-routine-${routine.id}`}
    >
      <View className="flex-1 gap-0.5">
        <LIText
          size="p"
          color="primary"
          text={routine.name}
          numberOfLines={1}
          className="font-geist-medium"
        />
        {/* What a coach actually asks: where are they in the rotation, and
            when they last did this one. Never "overdue" — nothing here is
            scheduled to a day, so nothing can be late. */}
        <LIText
          size="caption"
          color="muted"
          text={`${lifts} ${lifts === 1 ? 'exercise' : 'exercises'} · ${lastDoneLabel(
            routine.lastCompletedAt,
          ).toLowerCase()}`}
          className="font-geist"
        />
      </View>

      {/* The rotation's answer, same as the client sees on their own card. */}
      {isNext ? (
        <LIBadge tone="violet" label="Up next" labelClassName="font-geist-medium" />
      ) : null}

      {/* Says the copy has moved away from the template it came from —
          whoever moved it. It is what a publish will collide with. */}
      {routine.diverged ? (
        <LIBadge tone="warning" label="Changed" labelClassName="font-geist-medium" />
      ) : null}

      <ChevronRight color={tokens['foreground-muted']} size={16} />
    </Pressable>
  );
}

/**
 * The routines this client holds, and a way into each one.
 *
 * Editing here changes that client's copy and nobody else's. It sits above the
 * permission block on purpose: a coach can always see what they assigned, the
 * same reason the workouts card carries no permission note.
 */
export default function ReviewRoutinesCard({
  clientId,
  routines,
  week,
  loading,
}: ReviewRoutinesCardProps) {
  const nextId = nextInRotation(routines);

  return (
    <LICard className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <LIText size="h5" color="primary" text="Their routines" className="font-geist-semibold" />
        {routines.length > 0 ? (
          <LIText
            size="caption"
            color={week.done >= week.target ? 'success' : 'muted'}
            text={`${week.done} of ${week.target} this week`}
            className="font-geist-medium"
          />
        ) : null}
      </View>

      {loading ? (
        <RoutineRowSkeleton />
      ) : routines.length === 0 ? (
        <LIText
          size="caption"
          color="muted"
          text="Nothing assigned yet. Assign one from your programs."
          className="font-geist"
        />
      ) : (
        routines.map((routine) => (
          <RoutineRow
            key={routine.id}
            clientId={clientId}
            routine={routine}
            isNext={routine.id === nextId}
          />
        ))
      )}

      <LIText
        size="caption"
        color="muted"
        text="Editing here changes this client's copy only."
        className="border-t border-border pt-3 font-geist"
      />
    </LICard>
  );
}
