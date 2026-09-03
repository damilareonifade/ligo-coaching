import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';
import { deriveRosterStats, withLabelCounts } from '@/lib/roster';

import { client } from './client';
import {
  mockCreateLabel,
  mockDelay,
  mockDeleteLabel,
  mockRenameLabel,
  mockRoster,
} from './mocks';
import { queryKeys } from './queryKeys';
import type { ApiRoster, ApiRosterClient, ApiRosterLabel } from './types';

async function fetchRoster(): Promise<ApiRoster> {
  if (env.useMocks) {
    return mockDelay(mockRoster());
  }
  const { data } = await client.get<ApiRoster>('/coach/roster');
  return data;
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
  return {
    ...current,
    stats: deriveRosterStats(clients),
    clients,
    labels: withLabelCounts(labels, clients),
  };
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
  await client.post('/coach/roster/labels', input);
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
  await client.patch(`/coach/roster/labels/${id}`, { name: name.trim() });
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
  await client.delete(`/coach/roster/labels/${id}`);
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
