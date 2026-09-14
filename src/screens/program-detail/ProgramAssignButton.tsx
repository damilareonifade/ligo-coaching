import { useRouter } from 'expo-router';
import { UserPlus } from 'lucide-react-native';
import { useCallback } from 'react';

import { LIButton } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

interface ProgramAssignButtonProps {
  readonly programId: string;
  readonly assignedCount: number;
}

/**
 * Handing the program out, kept separate from publishing it.
 *
 * The two are easy to confuse and must not be: assigning gives new people a
 * copy, publishing asks the people who already hold one to take a change.
 * Sharing a button, or a screen, would blur that.
 */
export default function ProgramAssignButton({
  programId,
  assignedCount,
}: ProgramAssignButtonProps) {
  const tokens = useThemeTokens();
  const router = useRouter();

  const open = useCallback(() => {
    router.push({ pathname: '/programs/assign', params: { programId } });
  }, [router, programId]);

  return (
    <LIButton
      title={assignedCount === 0 ? 'Assign to clients' : 'Assign to more clients'}
      onPress={open}
      variant="outline"
      fullWidth
      icon={<UserPlus color={tokens.violet} size={18} />}
      testID="program-assign"
    />
  );
}
