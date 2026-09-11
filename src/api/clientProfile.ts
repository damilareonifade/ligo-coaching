import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';

import { client } from './client';
import {
  mockClientData,
  mockClientHealth,
  mockClientProfile,
  mockDelay,
  mockDetachCoach,
  mockIntegrations,
  mockNotificationSettings,
  mockToggleHealthShare,
  mockToggleIntegration,
  mockToggleNotification,
} from './mocks';
import { queryKeys } from './queryKeys';
import type {
  ApiClientData,
  ApiClientHealth,
  ApiClientProfile,
  ApiIntegration,
  ApiNotificationSettings,
} from './types';

/* ------------------------------------------------------------------ *
 * Profile
 * ------------------------------------------------------------------ */

async function fetchClientProfile(): Promise<ApiClientProfile> {
  if (env.useMocks) {
    return mockDelay(mockClientProfile());
  }
  const { data } = await client.get<ApiClientProfile>('/client/profile');
  return data;
}

export function useClientProfileQuery(): UseQueryResult<ApiClientProfile, Error> {
  return useQuery({ queryKey: queryKeys.clientProfile.profile, queryFn: fetchClientProfile });
}

/* ------------------------------------------------------------------ *
 * Detaching a coach.
 *
 * The client's half of every permission screen in the app, and the
 * only write that ends the relationship. It lives here rather than
 * beside the coach's own endpoints on purpose: this is not something
 * a coach can do, or be asked to approve.
 * ------------------------------------------------------------------ */

async function deleteCoachAttachment(): Promise<void> {
  if (env.useMocks) {
    mockDetachCoach();
    await mockDelay(undefined, 300);
    return;
  }
  await client.delete('/client/coach');
}

/**
 * Not optimistic, and that is deliberate.
 *
 * Everywhere else a control that waits for the network reads as broken. Here
 * an interface that says "detached" before the server agrees would be claiming
 * that access has ended when it may not have — the one lie this screen must
 * not tell. So the sheet holds its spinner until the write lands, then every
 * coach-dependent surface is invalidated at once: Today's coach card, the
 * profile's coach section, and the thread, which archives rather than
 * disappearing.
 */
export function useDetachCoachMutation(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCoachAttachment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.profile });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientTraining.today });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientChat });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientCheckIns });
    },
  });
}

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

async function fetchNotificationSettings(): Promise<ApiNotificationSettings> {
  if (env.useMocks) {
    return mockDelay(mockNotificationSettings());
  }
  const { data } = await client.get<ApiNotificationSettings>('/client/notifications');
  return data;
}

export function useNotificationSettingsQuery(): UseQueryResult<ApiNotificationSettings, Error> {
  return useQuery({
    queryKey: queryKeys.clientProfile.notifications,
    queryFn: fetchNotificationSettings,
  });
}

export interface ToggleNotificationInput {
  readonly groupId: string;
  readonly rowId: string;
  readonly enabled: boolean;
}

async function postToggleNotification({
  groupId,
  rowId,
  enabled,
}: ToggleNotificationInput): Promise<void> {
  if (env.useMocks) {
    mockToggleNotification(groupId, rowId, enabled);
    await mockDelay(undefined, 150);
    return;
  }
  await client.post('/client/notifications', { groupId, rowId, enabled });
}

/**
 * The knob has to move under the thumb — a switch that waits for the network
 * reads as broken. It rolls back if the write fails.
 */
export function useToggleNotificationMutation(): UseMutationResult<
  void,
  Error,
  ToggleNotificationInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postToggleNotification,
    onMutate: async ({ groupId, rowId, enabled }) => {
      const key = queryKeys.clientProfile.notifications;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiNotificationSettings>(key);

      queryClient.setQueryData<ApiNotificationSettings>(key, (current) =>
        current
          ? {
              ...current,
              groups: current.groups.map((group) =>
                group.id === groupId
                  ? {
                      ...group,
                      rows: group.rows.map((row) =>
                        row.id === rowId ? { ...row, enabled } : row,
                      ),
                    }
                  : group,
              ),
            }
          : current,
      );

      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.notifications });
    },
  });
}

/* ------------------------------------------------------------------ *
 * Integrations
 * ------------------------------------------------------------------ */

async function fetchIntegrations(): Promise<readonly ApiIntegration[]> {
  if (env.useMocks) {
    return mockDelay(mockIntegrations());
  }
  const { data } = await client.get<readonly ApiIntegration[]>('/client/integrations');
  return data;
}

export function useIntegrationsQuery(): UseQueryResult<readonly ApiIntegration[], Error> {
  return useQuery({
    queryKey: queryKeys.clientProfile.integrations,
    queryFn: fetchIntegrations,
  });
}

export interface ToggleIntegrationInput {
  readonly id: string;
  readonly connected: boolean;
}

async function postToggleIntegration({ id, connected }: ToggleIntegrationInput): Promise<void> {
  if (env.useMocks) {
    mockToggleIntegration(id, connected);
    await mockDelay(undefined, 200);
    return;
  }
  await client.post('/client/integrations', { id, connected });
}

/**
 * Optimistic, and deliberately mirrors the mock's rule: disconnecting clears
 * every flow, so the card never shows an app still reading from an account it
 * can no longer reach.
 */
export function useToggleIntegrationMutation(): UseMutationResult<
  void,
  Error,
  ToggleIntegrationInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postToggleIntegration,
    onMutate: async ({ id, connected }) => {
      const key = queryKeys.clientProfile.integrations;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<readonly ApiIntegration[]>(key);

      queryClient.setQueryData<readonly ApiIntegration[]>(key, (current) =>
        current?.map((integration) =>
          integration.id === id
            ? {
                ...integration,
                connected,
                status: connected ? 'Connected' : 'Not connected',
                flows: connected
                  ? integration.flows.map((flow) => ({ ...flow, active: flow.label === 'Read' }))
                  : integration.flows.map((flow) => ({ ...flow, active: false })),
              }
            : integration,
        ),
      );

      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.integrations });
    },
  });
}

/* ------------------------------------------------------------------ *
 * Data & privacy
 * ------------------------------------------------------------------ */

async function fetchClientData(): Promise<ApiClientData> {
  if (env.useMocks) {
    return mockDelay(mockClientData);
  }
  const { data } = await client.get<ApiClientData>('/client/data');
  return data;
}

export function useClientDataQuery(): UseQueryResult<ApiClientData, Error> {
  return useQuery({ queryKey: queryKeys.clientProfile.data, queryFn: fetchClientData });
}

export interface RunExportInput {
  readonly format: string;
  readonly includePrograms: boolean;
}

async function postRunExport({ format, includePrograms }: RunExportInput): Promise<void> {
  if (env.useMocks) {
    await mockDelay(undefined, 600);
    return;
  }
  await client.post('/client/data/export', { format, includePrograms });
}

export function useRunExportMutation(): UseMutationResult<void, Error, RunExportInput> {
  return useMutation({ mutationFn: postRunExport });
}

/* ------------------------------------------------------------------ *
 * Health profile
 * ------------------------------------------------------------------ */

async function fetchClientHealth(): Promise<ApiClientHealth> {
  if (env.useMocks) {
    return mockDelay(mockClientHealth());
  }
  const { data } = await client.get<ApiClientHealth>('/client/health');
  return data;
}

export function useClientHealthQuery(): UseQueryResult<ApiClientHealth, Error> {
  return useQuery({ queryKey: queryKeys.clientProfile.health, queryFn: fetchClientHealth });
}

/**
 * Health sharing is the one switch a client may flip in a hurry, standing in
 * front of the coach — so it lands instantly and rolls back on failure.
 */
export function useToggleHealthShareMutation(): UseMutationResult<void, Error, boolean> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shared: boolean) => {
      if (env.useMocks) {
        mockToggleHealthShare(shared);
        await mockDelay(undefined, 150);
        return;
      }
      await client.post('/client/health', { sharedWithCoach: shared });
    },
    onMutate: async (shared) => {
      const key = queryKeys.clientProfile.health;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiClientHealth>(key);

      queryClient.setQueryData<ApiClientHealth>(key, (current) =>
        current ? { ...current, sharedWithCoach: shared } : current,
      );

      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.health });
    },
  });
}
