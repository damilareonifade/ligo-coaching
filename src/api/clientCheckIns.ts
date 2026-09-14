import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import {
  checkInFromRow,
  checkInShareNote,
  checkInStats,
  dayLabel,
  formatDelta,
  measurementCell,
  monthLabel,
} from '@/lib/checkIns';
import { env } from '@/lib/env';
import { readUnits } from '@/lib/unitPreference';
import { displayLength } from '@/lib/units';

import { mockCheckIns, mockDelay, mockSaveCheckIn, mockToggleCoachEdit } from './mocks';
import { queryKeys } from './queryKeys';
import { assertOk, currentUserId, supabase, unwrap } from './supabase';
import type { ApiCheckIn, ApiMonthlyCheckIns, ApiSharePermissions } from './types';

/** "" and "  " are a field left blank, not a zero. */
function numberOrNull(value: string): number | null {
  const parsed = Number(value.trim().replace(',', '.'));
  return value.trim().length > 0 && Number.isFinite(parsed) ? parsed : null;
}

/** A year of months is what the list shows before anybody scrolls for more. */
const CHECK_IN_MONTHS = 12;

/**
 * Whose check-ins. `undefined` means the caller's own, which is the client
 * reading their own screen; a coach passes the client's id.
 *
 * It is a parameter rather than an assumption because a coach has no check-ins
 * of their own — no Progress tab, no check-in screen — so "the current user"
 * was never the right answer on their side of the app. What they may actually
 * do with it is decided by RLS: `monthly` to read, `log_for` to write.
 */
async function fetchCheckIns(forClientId?: string): Promise<ApiMonthlyCheckIns> {
  const units = readUnits();
  if (env.useMocks) {
    return mockDelay(mockCheckIns());
  }

  const clientId = forClientId ?? (await currentUserId());

  const [rows, links] = await Promise.all([
    supabase
      .rpc('monthly_check_ins', { p_client_id: clientId, p_months: CHECK_IN_MONTHS })
      .then(unwrap),
    supabase
      .from('coach_clients')
      .select('permissions, log_for, coach:users!coach_clients_coach_id_fkey(full_name)')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .limit(1)
      .then(unwrap),
  ]);

  const link = links[0];
  const coachName = link?.coach?.full_name ?? '';
  const permissions = (link?.permissions ?? {}) as ApiSharePermissions;

  // Newest first, which is how the rows already arrive and how the deltas are
  // read — each month against the one below it.
  const entries = rows.map((row, index) =>
    checkInFromRow(row, rows[index + 1] ?? null, units),
  );

  return {
    stats: checkInStats(entries, units),
    entries,
    // The `monthly` permission — one switch per domain, the same one the
    // coach's review card and the permissions screen read.
    coachCanEdit: Boolean(permissions.monthly),
    coachName: coachName.split(' ')[0] ?? '',
    note: checkInShareNote(coachName || null, Boolean(permissions.monthly), Boolean(link?.log_for)),
  };
}

export function useCheckInsQuery(
  forClientId?: string,
): UseQueryResult<ApiMonthlyCheckIns, Error> {
  return useQuery({
    queryKey: queryKeys.clientCheckIns(forClientId),
    queryFn: () => fetchCheckIns(forClientId),
  });
}

/* ------------------------------------------------------------------ *
 * Saving a check-in
 * ------------------------------------------------------------------ */

/** Numbers arrive from the keypad as text; blank means "not measured". */
export interface SaveCheckInInput {
  /** Present for an edit, absent for a new month. */
  readonly id?: string;
  /** Whose. Absent means the caller's own — see `fetchCheckIns`. */
  readonly clientId?: string;
  readonly weightKg: string;
  readonly waist: string;
  readonly chest: string;
  readonly hips: string;
  readonly bodyFat: string;
  readonly note: string;
}

export function composeCheckIn(
  input: SaveCheckInInput,
  entries: readonly ApiCheckIn[],
): ApiCheckIn {
  const index = input.id ? entries.findIndex((entry) => entry.id === input.id) : -1;
  const existing = index >= 0 ? entries[index] : null;
  // Entries run newest first, so the month being compared against is the next one down.
  const previous = index >= 0 ? entries[index + 1] : entries[0];
  const weightKg = Number(input.weightKg.trim());
  const now = new Date();
  const units = readUnits();
  const shown = (raw: string): string => {
    const value = Number(raw.trim());
    return raw.trim() === '' || !Number.isFinite(value)
      ? raw
      : String(Number(displayLength(value, units.length).toFixed(1)));
  };

  return {
    id: existing?.id ?? `chk-${Date.now()}`,
    label: existing?.label ?? monthLabel(now.toISOString()),
    weightKg: input.weightKg.trim(),
    delta: formatDelta(
      Number.isFinite(weightKg) ? weightKg : null,
      previous ? Number(previous.weightKg) : null,
    ),
    cells: [
      // `input` arrives in stored centimetres — the form converts on the way
      // out — so the optimistic row converts back to draw it.
      measurementCell('Waist', shown(input.waist), ` ${units.length}`),
      measurementCell('Chest', shown(input.chest), ` ${units.length}`),
      measurementCell('Hips', shown(input.hips), ` ${units.length}`),
      measurementCell('Body fat', input.bodyFat, '%'),
    ],
    note: input.note.trim(),
    // An edit keeps its original author; the client is always the author of a new one.
    by: existing?.by ?? 'you',
    byLine: existing?.byLine ?? `Logged by you · ${dayLabel(now)}`,
    photos: existing?.photos ?? 0,
  };
}

function upsert(current: ApiMonthlyCheckIns, entry: ApiCheckIn): ApiMonthlyCheckIns {
  const exists = current.entries.some((item) => item.id === entry.id);
  const entries = exists
    ? current.entries.map((item) => (item.id === entry.id ? entry : item))
    : [entry, ...current.entries];

  return {
    ...current,
    entries,
    stats: current.stats.map((stat) =>
      stat.label === 'Logged' ? { ...stat, value: `${entries.length}` } : stat,
    ),
  };
}

async function saveCheckIn(input: SaveCheckInInput): Promise<void> {
  if (env.useMocks) {
    mockSaveCheckIn(composeCheckIn(input, mockCheckIns().entries));
    await mockDelay(undefined, 250);
    return;
  }
  // A new month is a create; an existing one is addressed by its own id.
  const clientId = input.clientId ?? (await currentUserId());

  unwrap(
    await supabase.rpc('save_check_in', {
      p_client_id: clientId,
      p_check_in_id: input.id ?? null,
      p_weight_kg: numberOrNull(input.weightKg),
      p_waist_cm: numberOrNull(input.waist),
      p_chest_cm: numberOrNull(input.chest),
      p_hips_cm: numberOrNull(input.hips),
      p_body_fat_pct: numberOrNull(input.bodyFat),
      p_note: input.note,
    }),
  );
}

/**
 * The form closes on save, so the list behind it has to already carry the entry
 * — landing back on a list that has not changed reads as a lost check-in.
 */
export function useSaveCheckInMutation(): UseMutationResult<void, Error, SaveCheckInInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveCheckIn,
    onMutate: async (input) => {
      const key = queryKeys.clientCheckIns(input.clientId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiMonthlyCheckIns>(key);

      queryClient.setQueryData<ApiMonthlyCheckIns>(key, (current) =>
        current ? upsert(current, composeCheckIn(input, current.entries)) : current,
      );

      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientCheckIns(input.clientId) });
      // The coach's review card summarises these, and the client's Progress
      // card does too — both go stale the moment one is written.
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProgress });
      if (input.clientId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.coachClient.review(input.clientId),
        });
      }
    },
  });
}

/* ------------------------------------------------------------------ *
 * Coach write access
 * ------------------------------------------------------------------ */

async function postCoachEdit(enabled: boolean): Promise<void> {
  if (env.useMocks) {
    mockToggleCoachEdit(enabled);
    await mockDelay(undefined, 150);
    return;
  }
  // The `monthly` permission, not a switch of its own. A second flag for the
  // same question is a second thing to disagree with the coach's review card.
  assertOk(
    await supabase.rpc('set_coach_permission', { p_domain: 'monthly', p_shared: enabled }),
  );
}

/**
 * Optimistic for the same reason health sharing is: this is the switch a client
 * reaches for standing in front of the coach, and it has to move under the thumb.
 */
export function useToggleCoachEditMutation(): UseMutationResult<void, Error, boolean> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postCoachEdit,
    onMutate: async (enabled) => {
      // Always the caller's own: this is the client's switch, and a coach has
      // no version of it.
      const key = queryKeys.clientCheckIns();
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiMonthlyCheckIns>(key);

      queryClient.setQueryData<ApiMonthlyCheckIns>(key, (current) =>
        current ? { ...current, coachCanEdit: enabled } : current,
      );

      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientCheckIns() });
    },
  });
}
