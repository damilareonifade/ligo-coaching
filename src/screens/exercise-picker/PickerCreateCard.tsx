import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { LIButton, LICard, LIText } from '@/components/ui';

/**
 * A miss is the normal end of a search for a coach with their own cues and
 * their own machines — so it offers the way out rather than apologising.
 */
export default function PickerCreateCard() {
  const router = useRouter();
  const { programId, routineId } = useLocalSearchParams<{ programId?: string; routineId?: string }>();
  // Carried through so "Save and add" can put the new exercise straight on the
  // day the coach opened the picker for.
  const createExercise = useCallback(() => {
    const params = new URLSearchParams();
    if (programId) params.set('programId', programId);
    if (routineId) params.set('routineId', routineId);
    const query = params.toString();
    router.push(query ? `/programs/new-exercise?${query}` : '/programs/new-exercise');
  }, [router, programId, routineId]);

  return (
    <LICard className="gap-3 border border-dashed border-border-strong bg-transparent">
      <LIText size="h5" color="primary" text="Not in the list?" className="font-geist-semibold" />
      <LIText
        size="caption"
        color="muted"
        text="Add it once with the muscle, the equipment and what it tracks, and it stays in your library."
        className="font-geist"
      />
      <LIButton
        title="Create an exercise"
        onPress={createExercise}
        fullWidth
        testID="picker-create"
      />
    </LICard>
  );
}
