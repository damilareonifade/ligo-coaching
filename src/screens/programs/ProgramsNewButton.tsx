import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback } from 'react';

import { LIButton } from '@/components/ui';
import { tokens } from '@/theme/tokens';

/**
 * Dashed rather than solid: this is the empty slot at the end of the library,
 * not a call to action competing with the programs already built.
 */
export default function ProgramsNewButton() {
  const router = useRouter();
  const openBuilder = useCallback(() => router.push('/programs/builder'), [router]);

  return (
    <LIButton
      title="New program"
      onPress={openBuilder}
      variant="ghost"
      shape="rounded"
      fullWidth
      icon={<Plus color={tokens.violet} size={18} />}
      className="border border-dashed border-violet-line"
      labelClassName="font-geist-medium"
      testID="programs-new"
    />
  );
}
