import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback } from 'react';

import { LIButton } from '@/components/ui';
import { tokens } from '@/theme/tokens';

interface CheckInAddButtonProps {
  /** Set when a coach is logging for a client — carried into the editor. */
  readonly clientId?: string;
}

export default function CheckInAddButton({ clientId }: CheckInAddButtonProps) {
  const router = useRouter();

  const openEditor = useCallback(
    () =>
      router.push(
        clientId
          ? { pathname: '/check-ins/edit', params: { clientId } }
          : '/check-ins/edit',
      ),
    [clientId, router],
  );

  return (
    <LIButton
      title={clientId ? 'Log one for them' : 'Log this month'}
      onPress={openEditor}
      fullWidth
      icon={<Plus color={tokens.white} size={18} />}
      testID="check-in-add"
    />
  );
}
