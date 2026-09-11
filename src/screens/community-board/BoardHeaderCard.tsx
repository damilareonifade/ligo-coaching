import { View } from 'react-native';

import type { ApiBoardStat } from '@/api/types';
import { LIBadge, LICard, LIText } from '@/components/ui';

interface BoardHeaderCardProps {
  readonly name: string;
  readonly metricLabel: string;
  readonly optedIn: boolean;
  readonly stats: readonly ApiBoardStat[];
}

/**
 * The board's own terms, above anyone's ranking: what it measures, over what
 * window, how often it moves — and, as a badge rather than a sentence, the
 * fact that the reader chose to be here.
 *
 * The stats are the client's own three numbers, not the board's leaders. A
 * header that opened with somebody else's total would make the screen about
 * the person at the top; this one is about the person holding the phone.
 */
export default function BoardHeaderCard({
  name,
  metricLabel,
  optedIn,
  stats,
}: BoardHeaderCardProps) {
  return (
    <LICard className="gap-3">
      <View className="flex-row items-start gap-2">
        <View className="flex-1 gap-0.5">
          <LIText size="h4" color="primary" text={name} className="font-geist-semibold" />
          <LIText size="caption" color="muted" text={metricLabel} className="font-geist" />
        </View>
        {optedIn ? (
          <LIBadge
            tone="violet"
            label="Opted in"
            className="px-2 py-0.5"
            labelClassName="font-geist-medium"
          />
        ) : null}
      </View>

      {stats.length > 0 ? (
        <View className="flex-row gap-2 border-t border-hairline pt-3">
          {stats.map((stat) => (
            <View key={stat.label} className="flex-1 gap-0.5">
              <LIText
                size="h5"
                color="primary"
                text={stat.value}
                numberOfLines={1}
                className="font-geist-semibold"
              />
              <LIText
                size="caption"
                color="muted"
                text={stat.label}
                numberOfLines={1}
                className="font-geist"
              />
            </View>
          ))}
        </View>
      ) : null}
    </LICard>
  );
}
