import { useCallback } from 'react';
import { View } from 'react-native';

import { LIButton } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';

/** Both actions are UI-only until the backend lands — same stub as SocialSignIn. */
export default function TrainQuickActions() {
  const showToast = useUiStore((state) => state.showToast);
  const stub = useCallback(() => showToast('Not connected yet', 'success'), [showToast]);

  return (
    <View className="flex-row gap-3">
      <LIButton
        title="Empty workout"
        onPress={stub}
        variant="outline"
        className="flex-1"
        testID="train-empty-workout"
      />
      <LIButton
        title="Log past session"
        onPress={stub}
        variant="outline"
        className="flex-1"
        testID="train-log-past-session"
      />
    </View>
  );
}
