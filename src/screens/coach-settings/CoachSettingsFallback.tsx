import { useCallback } from 'react';
import { View } from 'react-native';

import { LIButton, LIErrorState } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';

interface CoachSettingsFallbackProps {
  readonly message: string | undefined;
  readonly onRetry: () => void;
}

/**
 * What Settings shows when the profile will not load.
 *
 * Sign out is here, not only in the list below, because the list is inside the
 * success branch — so the one screen that can end a session hid it exactly
 * when a coach most needs it. Someone signed in as the wrong account, or on a
 * borrowed phone, or against a backend that has stopped answering, was left
 * with a Try again button and no way out.
 *
 * Signing out does not depend on the fetch that failed: it clears the local
 * session whatever the server says, so this works when nothing else on the
 * screen does.
 */
export default function CoachSettingsFallback({ message, onRetry }: CoachSettingsFallbackProps) {
  const signOut = useAuthStore((state) => state.signOut);

  const handleSignOut = useCallback(() => {
    void signOut();
  }, [signOut]);

  return (
    <View className="flex-1">
      <LIErrorState message={message} onRetry={onRetry} />
      <View className="px-6 pb-8">
        <LIButton
          title="Sign out"
          onPress={handleSignOut}
          variant="ghost"
          size="md"
          fullWidth
          labelClassName="text-danger"
          testID="coach-settings-sign-out-fallback"
        />
      </View>
    </View>
  );
}
