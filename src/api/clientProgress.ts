import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';
import { readUnits } from '@/lib/unitPreference';
import { formatWeight } from '@/lib/units';
import { checkInFromRow } from '@/lib/checkIns';
import { relativeTime } from '@/lib/format';

import { mockClientProgress, mockDelay, mockLogBodyWeight } from './mocks';
import { queryKeys } from './queryKeys';
import { assertOk, currentUserId, supabase, unwrap } from './supabase';
import type { ApiBodyWeightPoint, ApiClientProgress } from './types';

/* ------------------------------------------------------------------ *
 * The Progress tab.
 *
 * Volume and personal records are derived from sets the client already
 * logged — nothing new is stored for either. Body weight is the one
 * part with a table behind it, because a weight is a fact about a day
 * rather than a consequence of training.
 *
 * The monthly check-ins card is composed from the same measurements
 * once check-ins exist; until then it is empty and says so, rather
 * than the screen failing to load over a feature that is off.
 * ------------------------------------------------------------------ */

/** Eight weeks is what the volume chart draws and what the change compares. */
const VOLUME_WEEKS = 8;

/** Twelve points of weight history — enough for a trend, small enough to draw. */
const WEIGHT_POINTS = 12;

/** Three months on the summary card; the full list is a tap away. */
const MONTHLY_MINIS = 3;

function monthTick(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
}

/**
 * Month ticks only where the month changes, so the axis reads MAR · APR · MAY
 * rather than repeating itself under every point — `ApiBodyWeightPoint.label`
 * is an empty string for the points in between, by design.
 */
function toWeightSeries(
  rows: readonly { readonly measured_at: string; readonly weight_kg: number | null }[],
): readonly ApiBodyWeightPoint[] {
  let previousTick = '';

  return rows
    .filter((row): row is { measured_at: string; weight_kg: number } => row.weight_kg !== null)
    .map((row) => {
      const tick = monthTick(row.measured_at);
      const label = tick === previousTick ? '' : tick;
      previousTick = tick;
      return { label, kg: Number(row.weight_kg) };
    });
}

/** "+8.4%" against the week before. Zero when there is nothing to compare to. */
function changePct(volumes: readonly number[]): number {
  const current = volumes[volumes.length - 1] ?? 0;
  const previous = volumes[volumes.length - 2] ?? 0;
  if (previous === 0) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

async function fetchClientProgress(): Promise<ApiClientProgress> {
  const units = readUnits();
  if (env.useMocks) {
    return mockDelay(mockClientProgress());
  }

  const clientId = await currentUserId();

  const [volume, records, weights, checkIns] = await Promise.all([
    supabase
      .rpc('volume_history', { p_client_id: clientId, p_weeks: VOLUME_WEEKS })
      .then(unwrap),
    supabase.rpc('personal_records', { p_client_id: clientId }).then(unwrap),
    supabase
      .from('body_measurements')
      .select('measured_at, weight_kg')
      .eq('client_id', clientId)
      .not('weight_kg', 'is', null)
      .order('measured_at', { ascending: false })
      .limit(WEIGHT_POINTS)
      .then(unwrap),
    // The same rows the check-ins screen reads. The card here is a summary of
    // that screen, so it is composed from the same source rather than a second
    // count that could disagree with it.
    supabase
      .rpc('monthly_check_ins', { p_client_id: clientId, p_months: MONTHLY_MINIS })
      .then(unwrap),
  ]);

  const months = checkIns.map((row, index) =>
    checkInFromRow(row, checkIns[index + 1] ?? null, units),
  );

  const volumes = volume.map((week) => Number(week.volume_kg));
  // Oldest first for the chart; the query asked newest first so the limit
  // takes the most recent points rather than the first twelve ever recorded.
  const series = toWeightSeries([...weights].reverse());

  return {
    weeklyVolumeKg: volumes[volumes.length - 1] ?? 0,
    volumeChangePct: changePct(volumes),
    volumeBars: volume.map((week, index) => ({
      label: `W${index + 1}`,
      volumeKg: Number(week.volume_kg),
    })),
    personalRecords: records.map((record) => ({
      id: record.name,
      name: record.name,
      value: `${formatWeight(Number(record.weight_kg), units.weight)} × ${record.reps}`,
      when: relativeTime(record.achieved_at),
    })),
    bodyWeightKg: series[series.length - 1]?.kg ?? 0,
    bodyWeightSeries: series,
    monthlyChip: months.length === 0 ? 'None yet' : `${months.length} logged`,
    monthly: months.map((entry) => ({
      id: entry.id,
      label: entry.label,
      weight:
        entry.weightKg === '' ? '—' : formatWeight(Number(entry.weightKg), units.weight),
      delta: entry.delta,
      by: entry.by,
    })),
    // The client's own words from the most recent one, not a generated
    // observation. "Waist down, weight flat — that is recomposition" is a
    // reading of the numbers, and nothing here is qualified to make it.
    monthlyNote:
      months[0]?.note ||
      (months.length === 0
        ? 'Log one to start tracking how you change month to month.'
        : 'No note on your last check-in.'),
  };
}

export function useClientProgressQuery(): UseQueryResult<ApiClientProgress, Error> {
  return useQuery({ queryKey: queryKeys.clientProgress, queryFn: fetchClientProgress });
}

export interface LogBodyWeightInput {
  readonly weightKg: number;
}

/**
 * The only way into the weight chart while check-ins are off.
 *
 * Without this the card could never have anything in it: the chart is a read,
 * and the only other place a weight is entered is the monthly check-in screen,
 * which is a different feature behind a different flag.
 */
async function postBodyWeight({ weightKg }: LogBodyWeightInput): Promise<void> {
  if (env.useMocks) {
    mockLogBodyWeight(weightKg);
    await mockDelay(undefined, 200);
    return;
  }

  const clientId = await currentUserId();

  assertOk(
    await supabase.from('body_measurements').insert({
      client_id: clientId,
      weight_kg: weightKg,
      // Themselves. A coach writing one sets this to their own id, which is
      // how the history says who entered it.
      logged_by: clientId,
    }),
  );
}

export function useLogBodyWeightMutation(): UseMutationResult<void, Error, LogBodyWeightInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postBodyWeight,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProgress });
      // The profile hero counts sessions and PRs off the same training data.
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.profile });
    },
  });
}
