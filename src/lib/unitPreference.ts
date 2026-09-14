import type { UnitPreference } from '@/lib/units';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * The chosen units, read outside React.
 *
 * Several API modules compose display strings — "82.4 kg", "84 cm" — before a
 * screen ever sees them, so they cannot use `useUnits()`. Reading the store
 * imperatively is the honest alternative to a hook they cannot call.
 *
 * The consequence is that those payloads carry a unit baked in, so changing
 * the preference has to invalidate them. `/profile/units` does that; the
 * comment there names the keys.
 */
export function readUnits(): UnitPreference {
  const { unit, lengthUnit } = useSettingsStore.getState();
  return { weight: unit, length: lengthUnit };
}
