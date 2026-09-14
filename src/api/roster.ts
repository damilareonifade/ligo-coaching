import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';
import { relativeTime } from '@/lib/format';
import { deriveAccess, deriveAttention, rosterMeta, withLabelCounts } from '@/lib/roster';

import {
  mockCreateLabel,
  mockDelay,
  mockDeleteLabel,
  mockRenameLabel,
  mockRoster,
} from './mocks';
import { queryKeys } from './queryKeys';
import { assertOk, currentUserId, supabase, unwrap } from './supabase';
import type {
  ApiRoster,
  ApiRosterClient,
  ApiRosterLabel,
  ApiSharePermissions,
} from './types';

/** "MA" from "Maya Andersson" — the avatar when there is no photo. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Whole days since a timestamp, for the roster's recency sort. */
function daysSince(iso: string | null, now: Date): number {
  if (!iso) return Number.MAX_SAFE_INTEGER;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000));
}

async function fetchRoster(): Promise<ApiRoster> {
  if (env.useMocks) {
    return mockDelay(mockRoster());
  }

  const coachId = await currentUserId();

  const [rows, labelRows] = await Promise.all([
    supabase
      .from('roster_clients')
      .select('*')
      .eq('coach_id', coachId)
      .then(unwrap),
    supabase
      .from('roster_labels')
      .select('id, name, color')
      .eq('coach_id', coachId)
      .order('name')
      .then(unwrap),
  ]);

  const now = new Date();

  const clients: readonly ApiRosterClient[] = rows.map((row) => {
    const permissions = (row.permissions ?? {}) as ApiSharePermissions;
    const name = row.full_name ?? '';

    return {
      id: row.client_id ?? '',
      name,
      initials: initialsOf(name),
      // Both from the last finished workout, and both blank for a client who
      // has not shared workouts — the view returns NULL rather than hiding
      // them, because the coach is still coaching someone they cannot watch.
      daysAgo: daysSince(row.last_workout_at, now),
      when: row.is_training ? 'now' : row.last_workout_at ? relativeTime(row.last_workout_at, now) : '—',
      meta: rosterMeta(row.program_name, permissions),
      attention: deriveAttention(
        {
          isTraining: row.is_training ?? false,
          lastWorkoutAt: row.last_workout_at,
          acceptedAt: row.accepted_at,
        },
        now,
      ),
      access: deriveAccess(permissions),
      labelId: row.label_id,
    };
  });

  const labels: readonly ApiRosterLabel[] = labelRows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    // Recomputed below from the clients — a stored count goes stale the
    // moment a label is deleted.
    count: 0,
  }));

  return { clients, labels: withLabelCounts(labels, clients) };
}

export function useRosterQuery(): UseQueryResult<ApiRoster, Error> {
  return useQuery({ queryKey: queryKeys.roster, queryFn: fetchRoster });
}

/* ------------------------------------------------------------------ *
 * Labels. A coach files their own roster, so every one of these has to
 * land under the thumb — the list is right there and a beat of lag
 * reads as a tap that missed.
 * ------------------------------------------------------------------ */

/**
 * Counts and KPIs are derived, never patched, so an optimistic roster is
 * composed the same way the server composes one — the row that appears on
 * tap is the row the refetch hands back.
 */
function compose(
  current: ApiRoster,
  clients: readonly ApiRosterClient[],
  labels: readonly ApiRosterLabel[],
): ApiRoster {
  return { ...current, clients, labels: withLabelCounts(labels, clients) };
}

/** Shared plumbing: every label write is a local recompose, then a refetch. */
function useRosterMutation<TInput>(
  mutationFn: (input: TInput) => Promise<void>,
  update: (current: ApiRoster, input: TInput) => ApiRoster,
): UseMutationResult<void, Error, TInput> {
  const queryClient = useQueryClient();
  const key = queryKeys.roster;

  return useMutation({
    mutationFn,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiRoster>(key);

      queryClient.setQueryData<ApiRoster>(key, (current) =>
        current ? update(current, input) : current,
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export interface CreateLabelInput {
  readonly name: string;
  /** A `label-*` token name — see src/theme/labelColors.ts. */
  readonly color: string;
}

function newLabel(input: CreateLabelInput): ApiRosterLabel {
  return { id: `lbl-${Date.now()}`, name: input.name.trim(), color: input.color, count: 0 };
}

async function postLabel(input: CreateLabelInput): Promise<void> {
  if (env.useMocks) {
    mockCreateLabel(newLabel(input));
    await mockDelay(undefined, 200);
    return;
  }
  assertOk(
    await supabase.from('roster_labels').insert({
      coach_id: await currentUserId(),
      name: input.name.trim(),
      color: input.color,
    }),
  );
}

export function useCreateLabelMutation(): UseMutationResult<void, Error, CreateLabelInput> {
  return useRosterMutation(postLabel, (current, input) =>
    compose(current, current.clients, [...current.labels, newLabel(input)]),
  );
}

export interface RenameLabelInput {
  readonly id: string;
  readonly name: string;
}

async function patchLabel({ id, name }: RenameLabelInput): Promise<void> {
  if (env.useMocks) {
    mockRenameLabel(id, name.trim());
    await mockDelay(undefined, 200);
    return;
  }
  // The name only, never the filing — renaming a label moves nobody.
  assertOk(
    await supabase.from('roster_labels').update({ name: name.trim() }).eq('id', id),
  );
}

export function useRenameLabelMutation(): UseMutationResult<void, Error, RenameLabelInput> {
  return useRosterMutation(patchLabel, (current, { id, name }) =>
    compose(
      current,
      current.clients,
      current.labels.map((label) => (label.id === id ? { ...label, name: name.trim() } : label)),
    ),
  );
}

async function deleteLabel(id: string): Promise<void> {
  if (env.useMocks) {
    mockDeleteLabel(id);
    await mockDelay(undefined, 200);
    return;
  }
  // `coach_clients.label_id` is `on delete set null`, so this unfiles whoever
  // carried it and does nothing else — which is what the screen promises.
  assertOk(await supabase.from('roster_labels').delete().eq('id', id));
}

/**
 * Deleting a label unfiles whoever carried it and stops there — no client is
 * detached and no permission moves, which is what the screen promises the
 * coach before they confirm.
 */
export function useDeleteLabelMutation(): UseMutationResult<void, Error, string> {
  return useRosterMutation(deleteLabel, (current, id) =>
    compose(
      current,
      current.clients.map((entry) => (entry.labelId === id ? { ...entry, labelId: null } : entry)),
      current.labels.filter((label) => label.id !== id),
    ),
  );
}
