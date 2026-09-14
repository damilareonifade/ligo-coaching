import { useCallback } from 'react';
import { View } from 'react-native';

import { queryKeys } from '@/api/queryKeys';
import { useQueryClient } from '@tanstack/react-query';

import { LICard, LISegmented, LIText } from '@/components/ui';
import { formatLength, formatWeight, type LengthUnit, type WeightUnit } from '@/lib/units';
import { useSettingsStore } from '@/store/settingsStore';

const WEIGHT_OPTIONS = [
  { value: 'kg', label: 'Kilograms' },
  { value: 'lb', label: 'Pounds' },
] as const;

const LENGTH_OPTIONS = [
  { value: 'cm', label: 'Centimetres' },
  { value: 'in', label: 'Inches' },
] as const;

/**
 * Which units this person reads in.
 *
 * A display choice and nothing more: Ligo stores kilograms and centimetres
 * whatever is picked here, so a client on pounds and their coach on kilos are
 * looking at one number written two ways. Nothing is converted in the
 * database, and switching back and forth cannot drift a weight.
 *
 * It follows the account rather than the phone — `useSettingsSync` puts it in
 * `public.cache` — so a second device does not start back on kilograms.
 */
export default function UnitsContent() {
  const queryClient = useQueryClient();
  const weight = useSettingsStore((state) => state.unit);
  const length = useSettingsStore((state) => state.lengthUnit);
  const setUnit = useSettingsStore((state) => state.setUnit);
  const setLengthUnit = useSettingsStore((state) => state.setLengthUnit);

  /**
   * Most of the app formats where it draws and re-renders on its own. These
   * four do not: their payloads arrive with "82.4 kg" already written, because
   * they are composed in the API layer. Without this they would keep the old
   * unit until something else happened to refetch them.
   */
  const refreshComposed = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.clientProgress });
    void queryClient.invalidateQueries({ queryKey: queryKeys.clientCheckIns() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.coachClient.review('') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.coach });
  }, [queryClient]);

  const chooseWeight = useCallback(
    (value: string) => {
      setUnit(value as WeightUnit);
      refreshComposed();
    },
    [refreshComposed, setUnit],
  );

  const chooseLength = useCallback(
    (value: string) => {
      setLengthUnit(value as LengthUnit);
      refreshComposed();
    },
    [refreshComposed, setLengthUnit],
  );

  return (
    <View className="gap-4 px-4 pt-2">
      <LIText
        size="p"
        color="body"
        text="Changes how weights and measurements are shown, everywhere in the app. Nothing already logged is altered."
        className="font-geist"
      />

      <View className="gap-2">
        <LIText size="caption" color="muted" text="WEIGHT" className="px-1 font-geist-medium" />
        <LICard className="gap-3">
          <LISegmented
            options={WEIGHT_OPTIONS.map((option) => ({ ...option }))}
            value={weight}
            onChange={chooseWeight}
            testID="units-weight"
          />
          {/* A worked example, so the choice is read rather than guessed. */}
          <LIText
            size="caption"
            color="muted"
            text={`Your last session's bench shows as ${formatWeight(82.5, weight)}.`}
            className="font-geist"
          />
        </LICard>
      </View>

      <View className="gap-2">
        <LIText
          size="caption"
          color="muted"
          text="MEASUREMENTS"
          className="px-1 font-geist-medium"
        />
        <LICard className="gap-3">
          <LISegmented
            options={LENGTH_OPTIONS.map((option) => ({ ...option }))}
            value={length}
            onChange={chooseLength}
            testID="units-length"
          />
          <LIText
            size="caption"
            color="muted"
            text={`A waist of ${formatLength(84, length)} on your check-in.`}
            className="font-geist"
          />
        </LICard>
      </View>
    </View>
  );
}
