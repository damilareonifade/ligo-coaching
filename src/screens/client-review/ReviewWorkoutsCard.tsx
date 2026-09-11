import { View } from 'react-native';

import { LIChart } from '@/components/LIChart';
import { LICard, LIText } from '@/components/ui';

interface ReviewWorkoutsCardProps {
  readonly adherence: string;
  readonly bars: readonly { readonly label: string; readonly value: number }[];
}

/**
 * Four weeks of adherence. Workouts are the one domain a coach always has —
 * you cannot be someone's coach and not see whether they trained — so this
 * card carries no permission note and no badge. Its silence is the point:
 * everything below it has to say what it is allowed to show, and this does not.
 */
export default function ReviewWorkoutsCard({ adherence, bars }: ReviewWorkoutsCardProps) {
  return (
    <LICard className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <LIText
          size="h5"
          color="primary"
          text="Workouts · 4 weeks"
          className="font-geist-semibold"
        />
        <LIText
          size="caption"
          color="success"
          text={adherence}
          className="font-geist-medium"
          numberOfLines={1}
        />
      </View>

      {bars.length > 0 ? (
        <LIChart data={bars} tone="violet" height={140} />
      ) : (
        <LIText
          size="caption"
          color="muted"
          text="No sessions logged yet — the chart fills in from week one."
          className="font-geist"
        />
      )}
    </LICard>
  );
}
