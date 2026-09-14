import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback } from 'react';

import { LIButton } from '@/components/ui';
import { tokens } from '@/theme/tokens';

interface ProgramAddExerciseButtonProps {
  readonly programId: string;
  readonly routineId: string;
}

/** Carries the routine it was tapped from, so the picker can say where it lands. */
export default function ProgramAddExerciseButton({
  programId,
  routineId,
}: ProgramAddExerciseButtonProps) {
  const router = useRouter();

  const openPicker = useCallback(
    () => router.push({ pathname: '/programs/picker', params: { programId, routineId } }),
    [router, programId, routineId],
  );

  return (
    <LIButton
      title="Add exercise"
      onPress={openPicker}
      variant="ghost"
      shape="rounded"
      fullWidth
      icon={<Plus color={tokens.violet} size={18} />}
      className="border border-dashed border-violet-line"
      labelClassName="font-geist-medium"
      testID="program-add-exercise"
    />
  );
}
