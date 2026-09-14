/**
 * The coach's home screen.
 *
 * Not a Today, and deliberately not one. Nothing in this app is scheduled to a
 * day — a program is a rotation the client works through at their own pace —
 * so a coach has no "today" in the sense the old dashboard assumed, with its
 * scheduled times and its `missed` badge. What a coach has is a gym floor:
 * who is training right now, and who wants a look since last time.
 *
 * Both answers come from views that already exist. Nothing here needed a new
 * table; the previous screen needed a different question.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { env } from '@/lib/env';
import { relativeTime } from '@/lib/format';
import { deriveAccess, deriveAttention, rosterMeta } from '@/lib/roster';

import { mockCoachHome, mockDelay } from './mocks';
import { queryKeys } from './queryKeys';
import { currentUserId, supabase, unwrap } from './supabase';
import type {
  ApiCoachHome,
  ApiLiveClient,
  ApiRosterClient,
  ApiSharePermissions,
} from './types';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** "Upper A · 18 min in" — what they are doing and how long they have been at it. */
function liveMeta(title: string, startedAt: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(startedAt)) / 60_000));
  return `${title} · ${minutes} min in`;
}

async function fetchCoachHome(): Promise<ApiCoachHome> {
  if (env.useMocks) {
    return mockDelay(mockCoachHome());
  }

  const coachId = await currentUserId();

  const [live, roster] = await Promise.all([
    supabase
      .from('coach_live_sessions')
      .select('*')
      .eq('coach_id', coachId)
      .order('started_at')
      .then(unwrap),
    supabase.from('roster_clients').select('*').eq('coach_id', coachId).then(unwrap),
  ]);

  const now = new Date();

  const training: readonly ApiLiveClient[] = live.map((row) => {
    const name = row.full_name ?? '';
    const done = row.completed_set_count ?? 0;
    const total = row.set_count ?? 0;

    return {
      clientId: row.client_id ?? '',
      name,
      initials: initialsOf(name),
      meta: liveMeta(row.title ?? 'Workout', row.started_at ?? now.toISOString()),
      progress: `${done} of ${total} sets`,
    };
  });

  // Whoever is mid-workout is already at the top of the screen, so they are
  // left out of the list below rather than shown twice.
  const trainingIds = new Set(training.map((entry) => entry.clientId));

  const needsALook: readonly ApiRosterClient[] = roster
    .filter((row) => !trainingIds.has(row.client_id ?? ''))
    .map((row) => {
      const permissions = (row.permissions ?? {}) as ApiSharePermissions;
      const name = row.full_name ?? '';

      return {
        id: row.client_id ?? '',
        name,
        initials: initialsOf(name),
        daysAgo: 0,
        when: row.last_workout_at ? relativeTime(row.last_workout_at, now) : '—',
        meta: rosterMeta(row.program_name, permissions),
        attention: deriveAttention(
          {
            isTraining: false,
            lastWorkoutAt: row.last_workout_at,
            acceptedAt: row.accepted_at,
          },
          now,
        ),
        access: deriveAccess(permissions),
        labelId: row.label_id,
      };
    })
    // Only the ones actually asking for something. A coach opening this screen
    // wants the exceptions, not the register — the roster is the register.
    .filter((entry) => entry.attention === 'review' || entry.attention === 'quiet');

  return { training, needsALook, rosterCount: roster.length };
}

export function useCoachHomeQuery(): UseQueryResult<ApiCoachHome, Error> {
  return useQuery({
    queryKey: queryKeys.coachHome,
    queryFn: fetchCoachHome,
    // Someone finishing a set should show up without a pull-to-refresh, and a
    // minute is close enough for a screen a coach glances at between sets.
    refetchInterval: 60_000,
  });
}
