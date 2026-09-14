import type { WeightUnit } from '@/lib/units';

/* ------------------------------------------------------------------ *
 * Onboarding answers that mean something elsewhere in the app.
 * ------------------------------------------------------------------ */

/** What the targets screen offers. Two labels, each covering weight and length. */
export const UNIT_CHOICES = ['kg · cm', 'lb · in'] as const;

export type UnitChoice = (typeof UNIT_CHOICES)[number];

/**
 * "lb · in" → "lb".
 *
 * The screen asks one question about units and the app stores only the weight
 * half of the answer, because that is the only half anything formats. Anything
 * unrecognised falls back to kilograms, which is the app's default and the
 * majority of the world.
 */
export function unitFromOnboarding(choice: string): WeightUnit {
  return choice.trim().toLowerCase().startsWith('lb') ? 'lb' : 'kg';
}

/** The reverse, so the segmented control can show what is already stored. */
export function onboardingUnitFor(unit: WeightUnit): UnitChoice {
  return unit === 'lb' ? 'lb · in' : 'kg · cm';
}
