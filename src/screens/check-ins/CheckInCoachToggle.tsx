import { useCallback } from 'react';
import { View } from 'react-native';

import { useToggleCoachEditMutation } from '@/api/clientCheckIns';
import { LICard, LISwitch, LIText } from '@/components/ui';

interface CheckInCoachToggleProps {
  readonly coachName: string;
  readonly enabled: boolean;
}

/**
 * Write access, not visibility — off still leaves the coach reading the
 * check-ins, which is why the caption spells out what each state actually means.
 */
export default function CheckInCoachToggle({ coachName, enabled }: CheckInCoachToggleProps) {
  const toggle = useToggleCoachEditMutation();

  const handleToggle = useCallback(
    (next: boolean) => {
      toggle.mutate(next);
    },
    [toggle],
  );

  return (
    <LICard className="flex-row items-center gap-3">
      <View className="flex-1 gap-0.5">
        <LIText
          size="p"
          color="primary"
          text={`${coachName} can log & edit check-ins`}
          className="font-geist-medium"
        />
        <LIText
          size="caption"
          color="muted"
          text={
            enabled
              ? 'On — he can add and edit entries.'
              : 'Off — he can see them but not change them.'
          }
          className="font-geist"
        />
      </View>
      <LISwitch value={enabled} onValueChange={handleToggle} testID="check-in-coach-edit" />
    </LICard>
  );
}
