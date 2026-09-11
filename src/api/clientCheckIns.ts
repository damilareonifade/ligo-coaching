import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';

import { client } from './client';
import { mockCheckIns, mockDelay, mockSaveCheckIn, mockToggleCoachEdit } from './mocks';
import { queryKeys } from './queryKeys';
import type { ApiCheckIn, ApiMonthlyCheckIns } from './types';

async function fetchCheckIns(): Promise<ApiMonthlyCheckIns> {
  if (env.useMocks) {
    return mockDelay(mockCheckIns());
  }
  const { data } = await client.get<ApiMonthlyCheckIns>('/client/check-ins');
  return data;
}

export function useCheckInsQuery(): UseQueryResult<ApiMonthlyCheckIns, Error> {
  return useQuery({ queryKey: queryKeys.clientCheckIns, queryFn: fetchCheckIns });
}

/* ------------------------------------------------------------------ *
 * Saving a check-in
 * ------------------------------------------------------------------ */

/** Numbers arrive from the keypad as text; blank means "not measured". */
export interface SaveCheckInInput {
  /** Present for an edit, absent for a new month. */
  readonly id?: string;
  readonly weightKg: string;
  readonly waist: string;
  readonly chest: string;
  readonly hips: string;
  readonly bodyFat: string;
  readonly note: string;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function cell(label: string, value: string, unit: string) {
  const trimmed = value.trim();
  return { label, value: trimmed.length === 0 ? '—' : `${trimmed}${unit}` };
}

/**
 * A drop is the signed change against the month below it, using U+2212 to match
 * the rest of the app — a hyphen reads as punctuation next to a number.
 */
function formatDelta(weightKg: number, previousKg: number | null): string {
  if (previousKg === null || !Number.isFinite(previousKg)) return '—';
  const change = Math.round((weightKg - previousKg) * 10) / 10;
  if (change === 0) return '0.0';
  return change < 0 ? `−${Math.abs(change).toFixed(1)}` : `+${change.toFixed(1)}`;
}

/**
 * The label, delta and byLine are the server's work for real. Composing them in
 * one place here means the row that appears optimistically is the same row the
 * refetch hands back, rather than one that visibly rewrites itself a beat later.
 */
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

  return {
    id: existing?.id ?? `chk-${Date.now()}`,
    label: existing?.label ?? `${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
    weightKg: input.weightKg.trim(),
    delta: formatDelta(weightKg, previous ? Number(previous.weightKg) : null),
    cells: [
      cell('Waist', input.waist, ' cm'),
      cell('Chest', input.chest, ' cm'),
      cell('Hips', input.hips, ' cm'),
      cell('Body fat', input.bodyFat, '%'),
    ],
    note: input.note.trim(),
    // An edit keeps its original author; the client is always the author of a new one.
    by: existing?.by ?? 'you',
    byLine:
      existing?.byLine ??
      `Logged by you · ${now.getDate()} ${MONTHS_SHORT[now.getMonth()]}`,
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
  if (input.id) {
    await client.put(`/client/check-ins/${input.id}`, input);
    return;
  }
  await client.post('/client/check-ins', input);
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
      const key = queryKeys.clientCheckIns;
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
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientCheckIns });
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
  await client.post('/client/check-ins/coach-edit', { enabled });
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
      const key = queryKeys.clientCheckIns;
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientCheckIns });
    },
  });
}
