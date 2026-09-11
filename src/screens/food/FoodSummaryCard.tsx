import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { ApiFoodMacro } from '@/api/types';
import { LICard, LIProgressBar, LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

const RING_SIZE = 86;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const RING_CENTRE = RING_SIZE / 2;

interface KcalRingProps {
  readonly consumed: number;
  readonly target: number;
}

/**
 * Drawn rather than animated: the ring is read at a glance between bites, and
 * a dash-offset arc costs nothing next to a Skia canvas for one number.
 */
function KcalRing({ consumed, target }: KcalRingProps) {
  // A zero target would divide by zero and paint a full ring — read it as empty.
  const ratio = target > 0 ? Math.min(Math.max(consumed / target, 0), 1) : 0;

  return (
    <View
      style={{ width: RING_SIZE, height: RING_SIZE }}
      accessibilityRole="progressbar"
      accessibilityLabel={`${consumed.toLocaleString('en-US')} of ${target.toLocaleString('en-US')} kcal`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
    >
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_CENTRE}
          cy={RING_CENTRE}
          r={RING_RADIUS}
          stroke={tokens.field}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={RING_CENTRE}
          cy={RING_CENTRE}
          r={RING_RADIUS}
          stroke={tokens.violet}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${RING_LENGTH} ${RING_LENGTH}`}
          strokeDashoffset={RING_LENGTH * (1 - ratio)}
          // Start the arc at 12 o'clock instead of 3 o'clock.
          transform={`rotate(-90 ${RING_CENTRE} ${RING_CENTRE})`}
        />
      </Svg>

      <View className="absolute inset-0 items-center justify-center">
        <LIText
          size="h4"
          color="primary"
          text={consumed.toLocaleString('en-US')}
          className="font-geist-semibold"
        />
        <LIText
          size="caption"
          color="muted"
          text="KCAL"
          className="font-geist-medium tracking-wide"
        />
      </View>
    </View>
  );
}

interface MacroRowProps {
  readonly macro: ApiFoodMacro;
}

function MacroRow({ macro }: MacroRowProps) {
  const ratio = macro.target > 0 ? macro.consumed / macro.target : 0;

  return (
    <View className="gap-1">
      <View className="flex-row items-baseline justify-between">
        <LIText size="caption" color="body" text={macro.label} className="font-geist-medium" />
        <LIText
          size="caption"
          color="muted"
          text={`${macro.consumed} / ${macro.target} ${macro.unit}`}
          className="font-geist"
        />
      </View>
      <LIProgressBar value={ratio} tone="violet" label={`${macro.label} progress`} />
    </View>
  );
}

interface FoodSummaryCardProps {
  readonly kcalConsumed: number;
  readonly kcalTarget: number;
  readonly macros: readonly ApiFoodMacro[];
}

export default function FoodSummaryCard({
  kcalConsumed,
  kcalTarget,
  macros,
}: FoodSummaryCardProps) {
  return (
    <LICard className="flex-row items-center gap-4">
      <View className="items-center gap-1">
        <KcalRing consumed={kcalConsumed} target={kcalTarget} />
        <LIText
          size="caption"
          color="muted"
          text={`of ${kcalTarget.toLocaleString('en-US')}`}
          className="font-geist"
        />
      </View>

      <View className="flex-1 gap-3">
        {macros.map((macro) => (
          <MacroRow key={macro.label} macro={macro} />
        ))}
      </View>
    </LICard>
  );
}
