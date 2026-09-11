import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { ApiError } from './client';
import { queryKeys } from './queryKeys';
import { supabase } from './supabase';
import type { ApiDeviceSession } from './types';
import { deviceIdentity } from '@/lib/deviceIdentity';

type SessionRow = {
  readonly id: string;
  readonly device_id: string;
  readonly device_name: string;
  readonly platform: string;
  readonly app_version: string;
  readonly created_at: string;
  readonly last_seen_at: string;
  readonly revoked_at: string | null;
};

const COLUMNS = 'id, device_id, device_name, platform, app_version, created_at, last_seen_at, revoked_at';

function sessionFromRow(row: SessionRow, currentDeviceId: string): ApiDeviceSession {
  return {
    id: row.id,
    deviceId: row.device_id,
    deviceName: row.device_name === '' ? 'Unknown device' : row.device_name,
    platform: row.platform,
    appVersion: row.app_version,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    revokedAt: row.revoked_at,
    isCurrentDevice: row.device_id === currentDeviceId,
  };
}

function platformName(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS;
  return 'web';
}

/**
 * Records this install against the signed-in account, or refreshes the row if
 * it is already there. The unique index on (user_id, device_id) is the
 * conflict target, so signing in twice on one phone updates rather than
 * accumulates — and the database trigger bumps `last_seen_at` on the way.
 *
 * Failure here is deliberately non-fatal to the caller: a coach who cannot
 * write a telemetry row should still be signed in.
 */
export async function registerDeviceSession(): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return;

  const identity = await deviceIdentity();

  const { error } = await supabase.from('sessions').upsert(
    {
      user_id: userId,
      device_id: identity.deviceId,
      device_name: identity.deviceName,
      platform: platformName(),
      app_version: Constants.expoConfig?.version ?? '',
      revoked_at: null,
    },
    { onConflict: 'user_id,device_id' },
  );

  if (error) throw new ApiError(error.message, null);
}

export async function fetchDeviceSessions(): Promise<readonly ApiDeviceSession[]> {
  const identity = await deviceIdentity();

  const { data, error, status } = await supabase
    .from('sessions')
    .select(COLUMNS)
    .is('revoked_at', null)
    .order('last_seen_at', { ascending: false });

  if (error) throw new ApiError(error.message, status);
  return (data ?? []).map((row) => sessionFromRow(row, identity.deviceId));
}

/**
 * Marks another device's session as revoked.
 *
 * This does not invalidate that device's Supabase tokens — only GoTrue can do
 * that, and only for the whole account. It stops the device receiving pushes
 * and records the intent; a full remote sign-out needs an Edge Function
 * calling the admin API, which is a separate piece of work.
 */
export async function revokeDeviceSession(sessionId: string): Promise<void> {
  const { error, status } = await supabase
    .from('sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) throw new ApiError(error.message, status);
}

export function useDeviceSessionsQuery(
  enabled = true,
): UseQueryResult<readonly ApiDeviceSession[], Error> {
  return useQuery({
    queryKey: queryKeys.deviceSessions.all,
    queryFn: fetchDeviceSessions,
    enabled,
  });
}

export function useRevokeDeviceSessionMutation(): UseMutationResult<void, Error, string> {
  return useMutation({ mutationFn: revokeDeviceSession });
}
