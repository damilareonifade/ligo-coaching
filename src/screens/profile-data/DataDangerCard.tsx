import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { LIModal } from '@/components/LIModal';
import { LIButton, LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';

const WARNING =
  'Different from detaching a coach. This erases the profile itself — sessions, meals, measurements, custom foods. Export first; the archive stays readable without Ligo.';

/**
 * Deleting is deliberately two taps and a sheet. Nothing here actually deletes
 * anything yet — the confirm only toasts.
 */
export default function DataDangerCard() {
  const [confirming, setConfirming] = useState(false);
  const showToast = useUiStore((state) => state.showToast);

  const open = useCallback(() => setConfirming(true), []);
  const close = useCallback(() => setConfirming(false), []);

  const confirm = useCallback(() => {
    setConfirming(false);
    showToast('Not connected yet', 'success');
  }, [showToast]);

  return (
    <View className="gap-3 rounded-card border border-danger bg-white p-4">
      <LIText size="p" color="danger" text="Delete account" className="font-geist-semibold" />
      <LIText size="caption" color="muted" text={WARNING} className="font-geist" />
      <LIButton
        title="Delete my profile"
        variant="danger"
        fullWidth
        onPress={open}
        testID="data-delete-open"
      />

      <LIModal visible={confirming} onClose={close} title="Delete your profile?">
        <LIText size="caption" color="muted" text={WARNING} className="font-geist" />
        <View className="gap-2">
          <LIButton
            title="Delete"
            variant="danger"
            fullWidth
            onPress={confirm}
            testID="data-delete-confirm"
          />
          <LIButton title="Cancel" variant="ghost" fullWidth onPress={close} />
        </View>
      </LIModal>
    </View>
  );
}
