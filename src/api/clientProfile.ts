import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { env } from '@/lib/env';
import {
  buildCoachRows,
  buildProfileGroups,
  memberSinceLabel,
  permissionSummary,
} from '@/lib/clientProfile';
import { relativeTime } from '@/lib/format';
import {
  buildHealthSections,
  healthShareNote,
  supportsStatus,
  type HealthSection,
  type InjuryStatus,
} from '@/lib/health';
import { accessRequestBody, accessRequestTitle } from '@/lib/sharing';
import { useSettingsStore } from '@/store/settingsStore';

import { client } from './client';
import {
  mockAccessRequests,
  mockAnswerAccessRequest,
  mockClientData,
  mockAddHealthEntry,
  mockClientHealth,
  mockRemoveHealthEntry,
  mockClientProfile,
  mockDelay,
  mockDetachCoach,
  mockIntegrations,
  mockNotificationSettings,
  mockSetLogFor,
  mockSetSharePermission,
  mockSharePermissions,
  mockToggleHealthShare,
  mockToggleIntegration,
  mockToggleNotification,
} from './mocks';
import { queryKeys } from './queryKeys';
import { assertOk, currentUserId, supabase, unwrap } from './supabase';
import type {
  ApiAccessRequest,
  ApiClientCoachSummary,
  ApiClientData,
  ApiClientHealth,
  ApiClientProfile,
  ApiIntegration,
  ApiNotificationSettings,
  ApiSharePermissions,
  ApiSharePermissionsDetail,
  ShareDomain,
} from './types';

/** "SO" from "Sam Okafor" — the avatar when there is no photo. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/* ------------------------------------------------------------------ *
 * Profile
 * ------------------------------------------------------------------ */

/**
 * `coach_profiles` hangs off `users`, not off the link, so the gym and
 * specialties are reached through the coach rather than beside them. One
 * literal rather than a concatenation: supabase-js parses this string at the
 * type level, and anything it cannot read statically comes back untyped.
 */
const ATTACHED_COACH_SELECT =
  'coach_id, permissions, log_for, coach:users!coach_clients_coach_id_fkey(full_name, coach_profiles(gym, specialties))';

/** The app's own version line, not something the server has an opinion on. */
const VERSION_NOTE =
  'Ligo 2.4.0 · your profile works with no coach, no subscription and no export fee.';

async function fetchClientProfile(): Promise<ApiClientProfile> {
  if (env.useMocks) {
    return mockDelay(mockClientProfile());
  }

  const clientId = await currentUserId();

  const [me, links, stats] = await Promise.all([
    supabase
      .from('users')
      .select('full_name, email, created_at')
      .eq('id', clientId)
      .maybeSingle()
      .then(unwrap),
    // One coach at a time — `attach_coach` enforces it — so this is a list of
    // at most one, read as a list rather than `.single()` because none is the
    // normal case. Self-training is the default, not a failure.
    supabase
      .from('coach_clients')
      .select(ATTACHED_COACH_SELECT)
      .eq('client_id', clientId)
      .eq('status', 'active')
      .limit(1)
      .then(unwrap),
    supabase.rpc('client_stats', { p_client_id: clientId }).then(unwrap),
  ]);

  const link = links[0];
  const coachName = link?.coach?.full_name ?? null;
  const permissions = (link?.permissions ?? {}) as ApiSharePermissions;
  const totals = stats[0] ?? { sessions: 0, week_streak: 0, personal_records: 0 };

  const coach: ApiClientCoachSummary | null =
    link && coachName
      ? {
          id: link.coach_id,
          name: coachName,
          initials: initialsOf(coachName),
          line1: coachName,
          line2: link.coach?.coach_profiles?.gym || 'Your coach',
          permissionLabel: permissionSummary(permissions),
        }
      : null;

  return {
    name: me.full_name,
    email: me.email,
    memberSince: memberSinceLabel(me.created_at),
    stats: [
      { label: 'SESSIONS', value: String(totals.sessions) },
      { label: 'WEEK STREAK', value: String(totals.week_streak) },
      { label: 'PRS', value: String(totals.personal_records) },
    ],
    coach,
    coachRows: buildCoachRows(coachName, permissions),
    // Composed, not fetched — see src/lib/clientProfile.ts.
    groups: buildProfileGroups({
      unit: useSettingsStore.getState().unit,
      lengthUnit: useSettingsStore.getState().lengthUnit,
    }),
    version: VERSION_NOTE,
  };
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
  // Ends the link rather than erasing it: `invited_at` and `accepted_at` are
  // the history, and the sheet's promise is that access stops, not that the
  // relationship never happened. Everything the client holds survives —
  // copies of routines are theirs, not the coach's.
  assertOk(await supabase.rpc('detach_coach'));
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientCheckIns() });
      // The two that were missed. The Health screen names the coach in its
      // share note — "Sam can see your health profile" — and reads its own
      // query, so without this it went on saying so after the detach had
      // landed, which reads as a detach that did nothing. The requests list
      // is the same: questions from a coach who is no longer attached.
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.health });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.accessRequests });
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
    queryKey: queryKeys.clientProfile.notificationSettings,
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
      const key = queryKeys.clientProfile.notificationSettings;
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.notificationSettings });
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

  const clientId = await currentUserId();

  const [rows, links] = await Promise.all([
    supabase
      .from('health_entries')
      .select('id, section, label, value, status, order_index')
      .eq('client_id', clientId)
      .order('section')
      .order('order_index')
      .then(unwrap),
    supabase
      .from('coach_clients')
      .select('permissions, coach:users!coach_clients_coach_id_fkey(full_name)')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .limit(1)
      .then(unwrap),
  ]);

  const link = links[0];
  const coachName = link?.coach?.full_name ?? null;
  // The same key the coach's review card reads and the permissions screen
  // sets. There is no second switch for this.
  const shared = Boolean(
    ((link?.permissions ?? {}) as ApiSharePermissions).health,
  );

  return {
    sharedWithCoach: shared,
    shareNote: healthShareNote(coachName, shared),
    sections: buildHealthSections(
      rows.map((row) => ({
        id: row.id,
        section: row.section as HealthSection,
        label: row.label,
        value: row.value,
        chip: row.status ?? undefined,
      })),
    ),
  };
}

export interface SaveHealthEntryInput {
  readonly section: HealthSection;
  readonly label: string;
  readonly value: string;
  readonly status?: InjuryStatus | null;
}

async function postHealthEntry(input: SaveHealthEntryInput): Promise<void> {
  if (env.useMocks) {
    mockAddHealthEntry(input.section, input.label, input.value, input.status ?? null);
    await mockDelay(undefined, 200);
    return;
  }

  assertOk(
    await supabase.from('health_entries').insert({
      client_id: await currentUserId(),
      section: input.section,
      label: input.label.trim(),
      value: input.value.trim(),
      // Only an injury carries one, and the database refuses it anywhere else.
      status: supportsStatus(input.section) ? (input.status ?? null) : null,
    }),
  );
}

/**
 * Not optimistic. Everything else on this screen is a switch; this writes a
 * medical fact, and a row that appears and then vanishes because the write
 * failed is the wrong thing to do with one.
 */
export function useSaveHealthEntryMutation(): UseMutationResult<
  void,
  Error,
  SaveHealthEntryInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postHealthEntry,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.health });
    },
  });
}

async function deleteHealthEntry(entryId: string): Promise<void> {
  if (env.useMocks) {
    mockRemoveHealthEntry(entryId);
    await mockDelay(undefined, 200);
    return;
  }
  assertOk(await supabase.from('health_entries').delete().eq('id', entryId));
}

/** Theirs to remove, and removing it removes it — this is not an archive. */
export function useDeleteHealthEntryMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteHealthEntry,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.health });
    },
  });
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
      // The same permission the coach's review card reads and the onboarding
      // switches set — not a second flag that could disagree with it.
      assertOk(
        await supabase.rpc('set_coach_permission', {
          p_domain: 'health',
          p_shared: shared,
        }),
      );
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

/* ------------------------------------------------------------------ *
 * What a coach has asked to see.
 *
 * The coach's review screen has had a "Request access" button for as
 * long as it has existed, and until now the request went nowhere. This
 * is the other end of it: the questions waiting on this client, and the
 * two answers.
 *
 * A request grants nothing. Reading one changes nothing. The only thing
 * that moves a permission is the client answering, below.
 * ------------------------------------------------------------------ */

async function fetchAccessRequests(): Promise<readonly ApiAccessRequest[]> {
  if (env.useMocks) {
    return mockDelay(mockAccessRequests(), 200);
  }

  // RLS scopes this to the caller's own, and the open ones are all the client
  // has any use for — an answered request is history, and history about being
  // asked for something is not worth showing anyone.
  const rows = unwrap(
    await supabase
      .from('access_requests')
      .select('id, domain, requested_at, coach:users!access_requests_coach_id_fkey(full_name)')
      .is('answered_at', null)
      .order('requested_at', { ascending: false }),
  );

  return rows.map((row) => {
    const domain = row.domain as ShareDomain;
    const coachName = row.coach?.full_name ?? 'Your coach';

    return {
      id: row.id,
      coachName,
      domain,
      title: accessRequestTitle(coachName, domain),
      body: accessRequestBody(domain),
      when: relativeTime(row.requested_at),
    };
  });
}

export function useAccessRequestsQuery(): UseQueryResult<readonly ApiAccessRequest[], Error> {
  return useQuery({
    queryKey: queryKeys.clientProfile.accessRequests,
    queryFn: fetchAccessRequests,
  });
}

export interface AnswerAccessRequestInput {
  readonly requestId: string;
  readonly grant: boolean;
}

async function postAccessRequestAnswer({
  requestId,
  grant,
}: AnswerAccessRequestInput): Promise<void> {
  if (env.useMocks) {
    mockAnswerAccessRequest(requestId, grant);
    await mockDelay(undefined, 250);
    return;
  }
  // Granting flips the permission and closes the question together — a client
  // who agreed and then saw the coach ask again would reasonably conclude the
  // app had not listened.
  assertOk(
    await supabase.rpc('answer_access_request', {
      p_request_id: requestId,
      p_grant: grant,
    }),
  );
}

/**
 * Optimistic on the card's disappearance and nothing else.
 *
 * The row going is safe to guess at: either answer removes it, so a rollback
 * puts back exactly what was there. What is deliberately *not* guessed at is
 * the permission itself — the profile's coach section refetches, so what it
 * shows is what the database agreed to rather than what the tap intended.
 */
export function useAnswerAccessRequestMutation(): UseMutationResult<
  void,
  Error,
  AnswerAccessRequestInput
> {
  const queryClient = useQueryClient();
  const key = queryKeys.clientProfile.accessRequests;

  return useMutation({
    mutationFn: postAccessRequestAnswer,
    onMutate: async ({ requestId }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<readonly ApiAccessRequest[]>(key);

      queryClient.setQueryData<readonly ApiAccessRequest[]>(key, (current) =>
        current?.filter((request) => request.id !== requestId),
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.profile });
    },
  });
}

export interface SetSharePermissionInput {
  readonly domain: ShareDomain;
  readonly shared: boolean;
}

async function putSharePermission({ domain, shared }: SetSharePermissionInput): Promise<void> {
  if (env.useMocks) {
    mockSetSharePermission(domain, shared);
    await mockDelay(undefined, 200);
    return;
  }
  // Turning something off is the half that matters: a client who can grant but
  // not withdraw has not been given a choice. Either way it also closes an
  // open request for the same domain, so the coach is not left waiting on a
  // question the client has already answered by using the switch.
  assertOk(
    await supabase.rpc('set_coach_permission', { p_domain: domain, p_shared: shared }),
  );
}

export function useSetSharePermissionMutation(): UseMutationResult<
  void,
  Error,
  SetSharePermissionInput
> {
  const queryClient = useQueryClient();
  const key = queryKeys.clientProfile.sharePermissions;

  return useMutation({
    mutationFn: putSharePermission,
    // Optimistic, like every other switch in the app. A control that waits on
    // the network to move reads as broken, and this screen is six of them.
    onMutate: async ({ domain, shared }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiSharePermissionsDetail>(key);

      queryClient.setQueryData<ApiSharePermissionsDetail>(key, (current) =>
        current
          ? { ...current, permissions: { ...current.permissions, [domain]: shared } }
          : current,
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.profile });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.accessRequests });
      // The health screen reads the same `health` key through its own query.
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.health });
    },
  });
}

/* ------------------------------------------------------------------ *
 * The six switches, read live.
 * ------------------------------------------------------------------ */

async function fetchSharePermissions(): Promise<ApiSharePermissionsDetail> {
  if (env.useMocks) {
    return mockDelay(mockSharePermissions(), 200);
  }

  const links = await supabase
    .from('coach_clients')
    .select('permissions, log_for, coach:users!coach_clients_coach_id_fkey(full_name)')
    .eq('client_id', await currentUserId())
    .eq('status', 'active')
    .limit(1)
    .then(unwrap);

  const link = links[0];

  return {
    coachName: link?.coach?.full_name ?? null,
    permissions: (link?.permissions ?? {}) as ApiSharePermissions,
    logFor: link?.log_for ?? false,
  };
}

export function useSharePermissionsQuery(): UseQueryResult<ApiSharePermissionsDetail, Error> {
  return useQuery({
    queryKey: queryKeys.clientProfile.sharePermissions,
    queryFn: fetchSharePermissions,
  });
}

async function putLogFor(allowed: boolean): Promise<void> {
  if (env.useMocks) {
    mockSetLogFor(allowed);
    await mockDelay(undefined, 200);
    return;
  }
  assertOk(await supabase.rpc('set_log_for', { p_allowed: allowed }));
}

/**
 * The sixth switch, and the only one that grants a write rather than a read.
 *
 * Optimistic like the other five, but its consequences are not the same: the
 * other five let a coach look, this one lets them put a session in the
 * client's history under the client's name. The screen says so; this only has
 * to be as reliable as the rest.
 */
export function useSetLogForMutation(): UseMutationResult<void, Error, boolean> {
  const queryClient = useQueryClient();
  const key = queryKeys.clientProfile.sharePermissions;

  return useMutation({
    mutationFn: putLogFor,
    onMutate: async (allowed) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiSharePermissionsDetail>(key);

      queryClient.setQueryData<ApiSharePermissionsDetail>(key, (current) =>
        current ? { ...current, logFor: allowed } : current,
      );

      return { previous };
    },
    onError: (_error, _allowed, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientProfile.profile });
    },
  });
}
