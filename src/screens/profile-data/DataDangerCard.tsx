import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useDeactivateAccountMutation } from '@/api/clientProfile';
import { LIButton, LIDialog, LIText } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

/**
 * Says what happens, in the order somebody worries about it: the part that
 * ends, then the part that does not.
 */
const WARNING =
  'Your coach loses access immediately and every relationship ends. Nothing you logged is deleted — sessions, check-ins and measurements all stay, and signing in again brings the account back exactly as it was.';

/**
 * Deactivating, not deleting.
 *
 * The card offered a delete and never performed one; its own comment admitted
 * the confirm "only toasts". A soft deactivation is the better promise anyway:
 * somebody who leaves in January and comes back in March gets their history
 * rather than an empty app.
 *
 * Two taps and a dialog, because it ends every relationship the account has —
 * and through `LIDialog` rather than the bottom sheet, for the reason detach
 * uses it: a confirmation has to open.
 */
export default function DataDangerCard() {
  const [confirming, setConfirming] = useState(false);
  const showToast = useUiStore((state) => state.showToast);
  const signOut = useAuthStore((state) => state.signOut);
  const deactivate = useDeactivateAccountMutation();

  const open = useCallback(() => setConfirming(true), []);
  const close = useCallback(() => setConfirming(false), []);

  const confirm = useCallback(() => {
    deactivate.mutate(undefined, {
      onSuccess: () => {
        setConfirming(false);
        // Signing out is the visible half. Staying signed in to a dormant
        // account would be the app disagreeing with itself.
        void signOut();
      },
      onError: (error) => showToast(errorMessage(error), 'danger'),
    });
  }, [deactivate, signOut, showToast]);

  return (
    <View className="gap-3 rounded-card border border-danger bg-surface p-4">
      <LIText size="p" color="danger" text="Deactivate account" className="font-geist-semibold" />
      <LIText size="caption" color="muted" text={WARNING} className="font-geist" />
      <LIButton
        title="Deactivate my account"
        variant="danger"
        fullWidth
        onPress={open}
        testID="data-deactivate-open"
      />

      <LIDialog visible={confirming} onClose={close} title="Deactivate your account?">
        <LIText size="caption" color="muted" text={WARNING} className="font-geist" />
        <View className="gap-2">
          <LIButton
            title="Deactivate"
            variant="danger"
            fullWidth
            shape="rounded"
            loading={deactivate.isPending}
            onPress={confirm}
            testID="data-deactivate-confirm"
          />
          <LIButton title="Stay" variant="ghost" fullWidth shape="rounded" onPress={close} />
        </View>
      </LIDialog>
    </View>
  );
}
