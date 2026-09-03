import { useCallback } from 'react';
import { View } from 'react-native';

import { LICard, LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';

interface QuietHoursCardProps {
  readonly quietHours: string;
}

export default function QuietHoursCard({ quietHours }: QuietHoursCardProps) {
  const showToast = useUiStore((state) => state.showToast);
  const stub = useCallback(() => showToast('Not connected yet', 'success'), [showToast]);

  return (
    <LICard onPress={stub} testID="quiet-hours-card">
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-0.5">
          <LIText size="p" color="primary" text="Quiet hours" className="font-geist-medium" />
          <LIText
            size="caption"
            color="muted"
            text="Nothing buzzes except a coach message flagged urgent."
            className="font-geist"
          />
        </View>
        <LIText size="caption" color="muted" text={quietHours} className="font-geist" />
      </View>
    </LICard>
  );
}
