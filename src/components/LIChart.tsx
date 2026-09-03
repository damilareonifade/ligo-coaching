import { View } from 'react-native';
import { Bar, CartesianChart } from 'victory-native';

import { LIText } from '@/components/ui';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

export interface LIChartDatum {
  readonly label: string;
  readonly value: number;
}

export interface LIChartProps {
  readonly data: readonly LIChartDatum[];
  readonly height?: number;
  readonly tone?: 'accent' | 'violet' | 'primary';
  readonly className?: string;
}

/** Index signature is required by victory-native generics. */
type ChartRow = { [key: string]: number; index: number; value: number };

/**
 * Every tone resolves to violet post-palette-migration. The prop is kept so the
 * existing call sites (`tone="accent"` / `tone="primary"`) keep type-checking.
 */
const toneColor: Record<NonNullable<LIChartProps['tone']>, string> = {
  accent: tokens.violet,
  violet: tokens.violet,
  primary: tokens.violet,
};

/**
 * Bar chart for progress over time (weekly volume, adherence).
 * Axis labels are rendered as LIText below the canvas rather than inside Skia,
 * so they follow the app's type scale and need no font asset.
 */
export function LIChart({ data, height = 180, tone = 'accent', className }: LIChartProps) {
  const rows: ChartRow[] = data.map((datum, index) => ({ index, value: datum.value }));
  const color = toneColor[tone];
  // Anchor the axis at zero. Left to auto-scale, victory-native fits the domain
  // to [min, max], so the smallest bar renders at zero height — eight weeks of
  // volume between 31t and 42t looked like a jump from nothing to everything.
  const maxValue = data.reduce((max, datum) => Math.max(max, datum.value), 0);

  return (
    <View className={cn('gap-2', className)}>
      <View style={{ height }}>
        <CartesianChart
          data={rows}
          xKey="index"
          yKeys={['value']}
          domain={{ y: [0, maxValue > 0 ? maxValue : 1] }}
          domainPadding={{ left: 24, right: 24, top: 16 }}
        >
          {({ points, chartBounds }) => (
            <Bar
              points={points.value}
              chartBounds={chartBounds}
              color={color}
              roundedCorners={{ topLeft: 6, topRight: 6 }}
              innerPadding={0.35}
            />
          )}
        </CartesianChart>
      </View>

      <View className="flex-row justify-between">
        {data.map((datum) => (
          <LIText key={datum.label} size="caption" color="muted" text={datum.label} />
        ))}
      </View>
    </View>
  );
}
