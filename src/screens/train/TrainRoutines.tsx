import { Plus } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, View } from 'react-native';

import type { ApiRoutine } from '@/api/types';
import { LIBadge, LICard, LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';
import { tokens } from '@/theme/tokens';

interface TrainRoutinesProps {
  readonly routines: readonly ApiRoutine[];
}

export default function TrainRoutines({ routines }: TrainRoutinesProps) {
  const showToast = useUiStore((state) => state.showToast);
  const stub = useCallback(() => showToast('Not connected yet', 'success'), [showToast]);

  return (
    <LICard className="gap-3">
      <View className="flex-row items-center justify-between">
        <LIText size="h5" color="primary" text="Your routines" className="font-geist-semibold" />
        <LIText
          size="caption"
          color="muted"
          text={`${routines.length} saved`}
          className="font-geist-medium"
        />
      </View>

      {routines.length === 0 ? (
        <LIText
          size="caption"
          color="muted"
          text="No routines saved yet."
          className="font-geist"
        />
      ) : (
        routines.map((routine) => (
          <View key={routine.id} className="flex-row items-center gap-3">
            <View className="flex-1 gap-0.5">
              <LIText size="p" color="primary" text={routine.name} className="font-geist-medium" />
              <LIText size="caption" color="muted" text={routine.meta} className="font-geist" />
            </View>
            <LIBadge
              tone={routine.chip === 'Active' ? 'violet' : 'neutral'}
              label={routine.chip}
              labelClassName="font-geist-medium"
            />
          </View>
        ))
      )}

      <Pressable
        onPress={stub}
        accessibilityRole="button"
        className="flex-row items-center gap-2 border-t border-hairline pt-3 active:opacity-70"
        testID="train-build-routine"
      >
        <Plus color={tokens.violet} size={18} />
        <LIText
          size="p"
          color="accent"
          text="Build a routine or program"
          className="font-geist-medium"
        />
      </Pressable>
    </LICard>
  );
}
