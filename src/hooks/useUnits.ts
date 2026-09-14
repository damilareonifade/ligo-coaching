import { useMemo } from 'react';

import {
  displayLength,
  displayWeight,
  formatLength,
  formatSetWeight,
  formatVolume,
  formatWeight,
  storedLength,
  storedWeight,
  weightStep,
  type LengthUnit,
  type WeightUnit,
} from '@/lib/units';
import { useSettingsStore } from '@/store/settingsStore';

export interface Units {
  readonly weight: WeightUnit;
  readonly length: LengthUnit;
  /** "82.4 kg" */
  readonly formatWeight: (kg: number) => string;
  /** "62.5" — no unit, for a column with a heading. */
  readonly formatSetWeight: (kg: number) => string;
  /** "4,320 kg" */
  readonly formatVolume: (kg: number) => string;
  /** "84 cm" */
  readonly formatLength: (cm: number) => string;
  /** Stored → shown, for prefilling an input. */
  readonly displayWeight: (kg: number) => number;
  readonly displayLength: (cm: number) => number;
  /** Shown → stored, for saving one. */
  readonly storedWeight: (value: number) => number;
  readonly storedLength: (value: number) => number;
  /** One tap of a stepper, in the shown unit. */
  readonly weightStep: number;
}

/**
 * What the reader has chosen, and everything bound to it.
 *
 * A hook rather than passing units down as props, because they are not about
 * the data — two screens showing the same set disagree only about how to draw
 * it. Reading the preference where it is drawn keeps every weight in the app
 * in step without threading a unit through twenty component signatures.
 *
 * The reader's own preference, not the subject's: a coach on kilograms reading
 * a client who logs in pounds sees kilograms, because they are the one doing
 * the reading. One number underneath, two ways of saying it.
 */
export function useUnits(): Units {
  const weight = useSettingsStore((state) => state.unit);
  const length = useSettingsStore((state) => state.lengthUnit);

  return useMemo(
    () => ({
      weight,
      length,
      formatWeight: (kg: number) => formatWeight(kg, weight),
      formatSetWeight: (kg: number) => formatSetWeight(kg, weight),
      formatVolume: (kg: number) => formatVolume(kg, weight),
      formatLength: (cm: number) => formatLength(cm, length),
      displayWeight: (kg: number) => displayWeight(kg, weight),
      displayLength: (cm: number) => displayLength(cm, length),
      storedWeight: (value: number) => storedWeight(value, weight),
      storedLength: (value: number) => storedLength(value, length),
      weightStep: weightStep(weight),
    }),
    [weight, length],
  );
}
