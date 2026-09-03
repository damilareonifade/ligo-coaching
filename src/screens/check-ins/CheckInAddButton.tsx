import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback } from 'react';

import { LIButton } from '@/components/ui';
import { tokens } from '@/theme/tokens';

export default function CheckInAddButton() {
  const router = useRouter();

  const openEditor = useCallback(() => router.push('/check-ins/edit'), [router]);

  return (
    <LIButton
      title="Log this month"
      onPress={openEditor}
      fullWidth
      icon={<Plus color={tokens.white} size={18} />}
      testID="check-in-add"
    />
  );
}
