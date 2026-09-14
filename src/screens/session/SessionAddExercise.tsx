import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable } from 'react-native';

import { LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

interface SessionAddExerciseProps {
  readonly sessionId: string;
}

/**
 * Opens the exercise library against this workout. The same picker the coach
 * builds programs with — see `useAddExerciseToTarget`, which decides where a
 * picked exercise lands.
 */
export default function SessionAddExercise({ sessionId }: SessionAddExerciseProps) {
  const router = useRouter();

  const open = useCallback(() => {
    router.push({ pathname: '/programs/picker', params: { sessionId } });
  }, [router, sessionId]);

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      className="h-12 w-full flex-row items-center justify-center gap-2 rounded-card border border-dashed border-hairline-strong active:opacity-70"
      testID="session-add-exercise"
    >
      <Plus color={tokens.violet} size={18} />
      <LIText
        size="p"
        color="accent"
        text="Add exercise to this session"
        className="font-geist-medium"
      />
    </Pressable>
  );
}
