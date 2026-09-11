import { useCallback, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import type { ApiBodyWeightPoint } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

const CHART_HEIGHT = 96;
const DOT_RADIUS = 4;
/** Keeps the line and its end dot clear of the card's edges. */
const PADDING = DOT_RADIUS + 2;

interface ProgressBodyWeightProps {
  readonly currentKg: number;
  readonly series: readonly ApiBodyWeightPoint[];
}

/**
 * A line, not bars: body weight is one continuous quantity, and the shape of
 * the trend is the whole point — a bar per reading would hide it.
 */
export default function ProgressBodyWeight({ currentKg, series }: ProgressBodyWeightProps) {
  // Width is only known after layout; the SVG paints on the second pass.
  const [width, setWidth] = useState(0);

  const measure = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const values = series.map((point) => point.kg);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  // A dead-flat series would divide by zero — draw it down the middle instead.
  const span = max - min;

  const points = series.map((point, index) => {
    const x =
      series.length > 1
        ? PADDING + (index / (series.length - 1)) * (width - PADDING * 2)
        : width / 2;
    const ratio = span > 0 ? (point.kg - min) / span : 0.5;
    const y = CHART_HEIGHT - PADDING - ratio * (CHART_HEIGHT - PADDING * 2);
    return { x, y };
  });

  const last = points.at(-1);

  return (
    <LICard className="gap-3">
      <View className="flex-row items-baseline justify-between">
        <LIText size="caption" color="muted" text="Body weight" className="font-geist-medium" />
        <LIText
          size="h4"
          color="primary"
          text={`${currentKg} kg`}
          className="font-geist-semibold"
        />
      </View>

      <View onLayout={measure} style={{ height: CHART_HEIGHT }}>
        {width > 0 && points.length > 1 ? (
          <Svg width={width} height={CHART_HEIGHT}>
            <Polyline
              points={points.map((point) => `${point.x},${point.y}`).join(' ')}
              fill="none"
              stroke={tokens.violet}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {last ? (
              <Circle cx={last.x} cy={last.y} r={DOT_RADIUS} fill={tokens.violet} />
            ) : null}
          </Svg>
        ) : null}
      </View>

      <View className="flex-row justify-between">
        {series.map((point, index) => (
          <LIText
            // Most labels are blank spacers, so the index is the only stable key.
            key={`${point.label}-${index}`}
            size="caption"
            color="muted"
            text={point.label}
            className="font-geist"
          />
        ))}
      </View>
    </LICard>
  );
}
