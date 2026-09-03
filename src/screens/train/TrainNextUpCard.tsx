import { View } from 'react-native';

import type { ApiClientPlan, ApiNextUpPreviewRow } from '@/api/types';
import { LIBadge, LIButton, LICard, LIText } from '@/components/ui';

interface TrainNextUpCardProps {
  readonly plan: ApiClientPlan;
  readonly preview: readonly ApiNextUpPreviewRow[];
  readonly onStart: (planId: string) => void;
  readonly starting: boolean;
}

export default function TrainNextUpCard({
  plan,
  preview,
  onStart,
  starting,
}: TrainNextUpCardProps) {
  return (
    <LICard className="gap-3 border border-violet-line">
      <View className="flex-row items-center justify-between">
        <LIText size="caption" color="muted" text="Next up" className="font-geist-medium" />
        <LIBadge tone="violet" label={plan.source} labelClassName="font-geist-medium" />
      </View>

      <View className="gap-1">
        <LIText size="h3" color="primary" text={plan.title} className="font-geist-semibold" />
        <LIText size="caption" color="muted" text={plan.meta} className="font-geist" />
      </View>

      {preview.length > 0 ? (
        <View className="gap-2 border-t border-hairline pt-3">
          {preview.map((row) => (
            <View key={row.name} className="flex-row items-center justify-between">
              <LIText size="p" color="body" text={row.name} className="font-geist" />
              <LIText size="caption" color="muted" text={row.scheme} className="font-geist-medium" />
            </View>
          ))}
        </View>
      ) : null}

      <LIButton
        title="Start workout"
        onPress={() => onStart(plan.id)}
        loading={starting}
        fullWidth
        testID="train-start-workout"
      />
    </LICard>
  );
}
