/**
 * What onboarding asked for, written down.
 *
 * Every step of the flow wrote to a Zustand draft and `finishOnboarding` reset
 * it, so seven answers across five screens were collected and discarded. These
 * are the two writes that end that — one per side of the app, each a plain
 * upsert of the caller's own row under RLS.
 *
 * Deliberately not a query module: nothing reads these back yet except
 * `lookup_coach`, which is a coach's public face and belongs with the auth
 * flow that resolves it.
 */
import { env } from '@/lib/env';

import { mockDelay, mockSaveCoachProfile, mockSaveClientProfile } from './mocks';
import { assertOk, currentUserId, supabase } from './supabase';

export interface CoachProfileInput {
  readonly gym: string;
  readonly bio: string;
  readonly specialties: readonly string[];
}

export async function saveCoachProfile(input: CoachProfileInput): Promise<void> {
  if (env.useMocks) {
    mockSaveCoachProfile(input);
    await mockDelay(undefined, 200);
    return;
  }

  assertOk(
    await supabase.from('coach_profiles').upsert(
      {
        coach_id: await currentUserId(),
        gym: input.gym.trim(),
        bio: input.bio.trim(),
        specialties: [...input.specialties],
      },
      { onConflict: 'coach_id' },
    ),
  );
}

export interface ClientProfileInput {
  readonly goals: readonly string[];
  readonly experience: string;
  /** 1–7. What they are measured against until a coach assigns a program. */
  readonly sessionsPerWeek: number;
}

export async function saveClientProfile(input: ClientProfileInput): Promise<void> {
  if (env.useMocks) {
    mockSaveClientProfile(input);
    await mockDelay(undefined, 200);
    return;
  }

  assertOk(
    await supabase.from('client_profiles').upsert(
      {
        client_id: await currentUserId(),
        goals: [...input.goals],
        experience: input.experience.trim(),
        // Clamped rather than trusted: the constraint would reject anything
        // else, and a failed save here would cost the whole flow.
        sessions_per_week: Math.min(Math.max(Math.round(input.sessionsPerWeek), 1), 7),
      },
      { onConflict: 'client_id' },
    ),
  );
}
