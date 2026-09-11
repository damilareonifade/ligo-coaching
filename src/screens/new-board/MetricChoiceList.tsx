import { Pressable, View } from 'react-native';

import type { ApiBoardMetricOption, BoardMetric } from '@/api/types';
import { LIBadge, LIRadio, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';

interface MetricChoiceListProps {
  readonly options: readonly ApiBoardMetricOption[];
  readonly value: BoardMetric;
  readonly onChange: (metric: BoardMetric) => void;
}

/**
 * What the board ranks people on.
 *
 * Body weight carries a `Sensitive` badge in `warning` and is not hidden,
 * disabled or moved to the bottom of a submenu. A coach may have a good reason
 * to run it, and a coach who does should be looking at the word "Sensitive"
 * while they decide — a metric that is quietly unavailable teaches nobody
 * anything, and the client on the other end still has to consent either way.
 */
export default function MetricChoiceList({ options, value, onChange }: MetricChoiceListProps) {
  return (
    <View className="gap-2">
      <LIText
        size="caption"
        color="muted"
        text="RANKING METRIC"
        className="px-1 font-geist-medium tracking-wide"
      />

      <View className="rounded-card bg-white px-4">
        {options.map((option, index) => {
          const selected = option.id === value;

          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(option.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={
                option.sensitive
                  ? `${option.label}. ${option.desc}. Sensitive.`
                  : `${option.label}. ${option.desc}`
              }
              className={cn(
                'flex-row items-start gap-3 py-3 active:opacity-70',
                index > 0 && 'border-t border-hairline',
              )}
              testID={`metric-${option.id}`}
            >
              <View className="mt-0.5">
                <LIRadio selected={selected} />
              </View>

              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-2">
                  <LIText
                    size="p"
                    color="primary"
                    text={option.label}
                    numberOfLines={1}
                    className="shrink font-geist-medium"
                  />
                  {option.sensitive ? (
                    <LIBadge
                      tone="warning"
                      label="Sensitive"
                      className="px-2 py-0.5"
                      labelClassName="font-geist-medium"
                      testID="metric-sensitive-badge"
                    />
                  ) : null}
                </View>
                <LIText size="caption" color="muted" text={option.desc} className="font-geist" />
              </View>
            </Pressable>
          );
        })}
      </View>

      <LIText
        size="caption"
        color="muted"
        text="Whatever you pick, each client sees the metric before they decide whether to appear."
        className="px-1 font-geist"
      />
    </View>
  );
}
