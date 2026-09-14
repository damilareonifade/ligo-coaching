import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import { useCacheExerciseGifMutation, useExercisePreviewQuery } from '@/api/exercises';
import ScreenHeader from '@/components/chrome/ScreenHeader';
import { LIEmptyState, LIErrorState, LISafeArea } from '@/components/ui';
import ExercisePreviewContent from '@/screens/exercise-preview/ExercisePreviewContent';
import ExercisePreviewSkeleton from '@/screens/exercise-preview/ExercisePreviewSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

/**
 * What a movement looks like, reachable from anywhere one is named.
 *
 * Routed on the display name rather than the catalogue id, because the four
 * places that link here hold different things — a picker row has an id, a
 * routine block has a renamed copy, a logged exercise has whatever the client
 * called it. The id rides along as a param when it is known and is preferred
 * over the name; see `exercise_preview`.
 */
export default function ExercisePreviewScreen() {
  const { name, exerciseId } = useLocalSearchParams<{
    name: string;
    exerciseId?: string;
  }>();

  /**
   * Router params cannot carry null, so a caller with no catalogue link sends
   * an empty string — and `??` does not catch one. Left alone it reaches
   * Postgres as a uuid of `''`, which fails the whole query rather than
   * falling back to the name. That was the bug that made previews look like
   * they had no animation: they had no data at all.
   */
  const linkedId = exerciseId && exerciseId.length > 0 ? exerciseId : null;

  const { data, isPending, error, refetch } = useExercisePreviewQuery({
    exerciseId: linkedId,
    name: name ?? null,
  });

  const { mutate: cacheGif, isPending: fetchingGif } = useCacheExerciseGifMutation();

  /**
   * The first person to open this exercise pays for its animation; nobody pays
   * again. Fired once, and only when there is something to fetch — an
   * exercise somebody typed has no `externalId` and no animation to go and
   * get, which is why the guard is on that rather than on `gifUrl` alone.
   */
  const warmed = useRef(false);
  useEffect(() => {
    if (warmed.current) return;
    if (!data || data.gifUrl || !data.externalId) return;

    warmed.current = true;
    cacheGif(data.id);
  }, [cacheGif, data]);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <LISafeArea>
      <ScreenHeader title={name ?? 'Exercise'} eyebrow="How it is done" backLabel="Back" />

      {isPending ? <ExercisePreviewSkeleton /> : null}

      {!isPending && error ? <LIErrorState message={error.message} onRetry={refresh} /> : null}

      {/* `null` is an answer, not a failure: an exercise a coach invented has
          no catalogue entry, and saying so is better than an empty screen. */}
      {!isPending && !error && !data ? (
        <LIEmptyState
          title="Nothing to show for this one"
          message="This exercise was added by hand, so there is no animation or guide for it. Your own notes on it still apply."
        />
      ) : null}

      {!isPending && data ? (
        <ExercisePreviewContent preview={data} fetchingGif={fetchingGif} />
      ) : null}
    </LISafeArea>
  );
}
