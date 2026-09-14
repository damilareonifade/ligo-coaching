import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { canToggleNotification, toggleNotification } from '@/lib/coachProfile';
import { buildCoachSettingsGroups, coachSettingsHeadline } from '@/lib/coachSettings';
import { env } from '@/lib/env';

import { ApiError } from './client';
import {
  mockCoachProfile,
  mockCoachProfileForm,
  mockDelay,
  mockRegenerateInviteCode,
  mockSaveCoachProfile,
  mockToggleCoachNotification,
} from './mocks';
import { queryKeys } from './queryKeys';
import { assertOk, currentUserId, supabase, unwrap } from './supabase';
import type { ApiCoachProfile, ApiCoachProfileForm } from './types';

/* ------------------------------------------------------------------ *
 * The coach's own account.
 * ------------------------------------------------------------------ */

const COACH_SELECT = 'full_name, invite_code, coach_profiles(gym, bio, specialties)';

async function fetchCoachProfile(): Promise<ApiCoachProfile> {
  if (env.useMocks) {
    return mockDelay(mockCoachProfile());
  }

  const coachId = await currentUserId();

  const [me, clients, labels] = await Promise.all([
    supabase.from('users').select(COACH_SELECT).eq('id', coachId).maybeSingle().then(unwrap),
    supabase
      .from('coach_clients')
      .select('client_id', { count: 'exact', head: true })
      .eq('coach_id', coachId)
      .eq('status', 'active')
      .then((result) => result.count ?? 0),
    supabase
      .from('roster_labels')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', coachId)
      .then((result) => result.count ?? 0),
  ]);

  const profile = me.coach_profiles;
  const inviteCode = me.invite_code ?? '';

  return {
    name: me.full_name,
    headline: coachSettingsHeadline(profile?.specialties ?? [], profile?.gym ?? '', clients),
    inviteCode,
    // Nothing stores a notification preference, because nothing sends a
    // notification — so there is nothing truthful to list. The card that would
    // render these is hidden behind the `notifications` feature flag until
    // both exist; an empty array is what "not built" looks like here.
    notifications: [],
    // Composed, not fetched — see src/lib/coachSettings.ts.
    groups: buildCoachSettingsGroups({ inviteCode, labelCount: labels }),
  };
}

export function useCoachProfileQuery(): UseQueryResult<ApiCoachProfile, Error> {
  return useQuery({ queryKey: queryKeys.coachProfile, queryFn: fetchCoachProfile });
}

export interface ToggleCoachNotificationInput {
  readonly id: string;
  readonly enabled: boolean;
}

async function postToggleCoachNotification({
  id,
  enabled,
}: ToggleCoachNotificationInput): Promise<void> {
  if (env.useMocks) {
    mockToggleCoachNotification(id, enabled);
    await mockDelay(undefined, 150);
    return;
  }
  // Unreachable while the `notifications` flag is off, which is what hides the
  // card that calls this. It refuses rather than posting to a host that no
  // longer resolves, so whoever turns the flag on gets told what is missing
  // instead of a DNS error — there is no table behind this yet, because
  // nothing sends a notification to have a preference about.
  throw new ApiError('Notification settings are not available yet.', 501);
}

/**
 * Optimistic, like every other switch in the app — and refusing, unlike any of
 * them.
 *
 * The refusal is here rather than only on the switch. A disabled control is a
 * statement about a screen; this is a statement about the account, and it has
 * to hold for a caller that never rendered the screen. `mutationFn` rejects a
 * locked row before any request is made, and `onMutate` runs the same
 * `toggleNotification` the mock does, which leaves a locked row untouched — so
 * there is no path, optimistic or otherwise, that turns this notification off.
 */
export function useToggleCoachNotificationMutation(): UseMutationResult<
  void,
  Error,
  ToggleCoachNotificationInput
> {
  const queryClient = useQueryClient();
  const key = queryKeys.coachProfile;

  return useMutation({
    mutationFn: async (input: ToggleCoachNotificationInput) => {
      const current = queryClient.getQueryData<ApiCoachProfile>(key);
      const row = current?.notifications.find((candidate) => candidate.id === input.id);

      if (row && !canToggleNotification(row)) {
        throw new ApiError(
          'Permission changes cannot be muted they change what you are allowed to do.',
          403,
        );
      }

      await postToggleCoachNotification(input);
    },
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiCoachProfile>(key);

      queryClient.setQueryData<ApiCoachProfile>(key, (current) =>
        current
          ? { ...current, notifications: toggleNotification(current.notifications, id, enabled) }
          : current,
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

/* ------------------------------------------------------------------ *
 * The invite code.
 *
 * Its own query rather than a field on the profile, because three
 * screens show it — onboarding, the roster's empty state and settings —
 * and until now each invented its own. The fixtures held 'SAM-4KQ2'
 * while CoachCodeStep computed one from the coach's name, so a coach
 * called Sam Okafor saw SAM-MWT7 while signing up and SAM-4KQ2
 * afterwards. One source, one code.
 * ------------------------------------------------------------------ */

async function fetchInviteCode(): Promise<string> {
  if (env.useMocks) {
    return mockDelay(mockCoachProfile().inviteCode, 150);
  }

  const { data, error, status } = await supabase
    .from('users')
    .select('invite_code')
    .eq('id', await currentUserId())
    .maybeSingle();

  if (error) throw new ApiError(error.message, status);
  // NULL means the account is not a coach — the code is issued by trigger the
  // moment someone becomes one, so there is no state where a coach lacks it.
  if (!data?.invite_code) throw new ApiError('Only a coach has an invite code.', 403);
  return data.invite_code;
}

export function useInviteCodeQuery(): UseQueryResult<string, Error> {
  return useQuery({ queryKey: queryKeys.coachInviteCode, queryFn: fetchInviteCode });
}

async function postRegenerateInviteCode(): Promise<string> {
  if (env.useMocks) {
    return mockDelay(mockRegenerateInviteCode(), 250);
  }
  return unwrap(await supabase.rpc('regenerate_invite_code'));
}

/**
 * Rolling the code. A code texted into a group chat is out there for good, so
 * a coach needs a way to stop honouring it — and everyone already attached
 * stays attached, because the code was the door, not the relationship.
 *
 * Not optimistic: a guessed code is one a coach might read out loud.
 */
export function useRegenerateInviteCodeMutation(): UseMutationResult<string, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postRegenerateInviteCode,
    onSuccess: (code) => {
      queryClient.setQueryData(queryKeys.coachInviteCode, code);
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachProfile });
    },
  });
}

/* ------------------------------------------------------------------ *
 * The editable profile.
 *
 * Separate from `useCoachProfileQuery`, which returns a rendered
 * headline and a list of settings rows — presentation, and no way back
 * to the three fields it was built from. The editor needs the fields
 * themselves, and only opens on a tap, so it fetches them then rather
 * than widening the payload every settings visit pays for.
 *
 * Onboarding writes the same row through `saveCoachProfile`; a coach
 * changing gyms a year later is the same write, so this reuses it.
 * ------------------------------------------------------------------ */

async function fetchCoachProfileForm(): Promise<ApiCoachProfileForm> {
  if (env.useMocks) {
    return mockDelay(mockCoachProfileForm(), 200);
  }

  const { data: row, error, status } = await supabase
    .from('users')
    .select('full_name, coach_profiles(gym, bio, specialties)')
    .eq('id', await currentUserId())
    .maybeSingle();

  if (error) throw new ApiError(error.message, status);
  if (!row) throw new ApiError('Your account could not be read.', status);

  return {
    name: row.full_name,
    // A coach who signed up before `coach_profiles` existed, or who skipped
    // the step, has no row — that is an empty form, not an error.
    gym: row.coach_profiles?.gym ?? '',
    bio: row.coach_profiles?.bio ?? '',
    specialties: row.coach_profiles?.specialties ?? [],
  };
}

export function useCoachProfileFormQuery(): UseQueryResult<ApiCoachProfileForm, Error> {
  return useQuery({ queryKey: queryKeys.coachProfileForm, queryFn: fetchCoachProfileForm });
}

async function putCoachProfileForm(input: ApiCoachProfileForm): Promise<void> {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new ApiError('Your name is what a client sees — it cannot be blank.', 400);
  }

  if (env.useMocks) {
    mockSaveCoachProfile({ gym: input.gym, bio: input.bio, specialties: input.specialties });
    await mockDelay(undefined, 250);
    return;
  }

  const coachId = await currentUserId();

  // Two rows, two writes: the display name lives on `users` because every
  // side of the app reads it, and the coaching fields hang off
  // `coach_profiles` because only this side has them.
  assertOk(await supabase.from('users').update({ full_name: name }).eq('id', coachId));
  assertOk(
    await supabase.from('coach_profiles').upsert(
      {
        coach_id: coachId,
        gym: input.gym.trim(),
        bio: input.bio.trim(),
        specialties: [...input.specialties],
      },
      { onConflict: 'coach_id' },
    ),
  );
}

/**
 * Saving the profile.
 *
 * Not optimistic. Everything else on this screen is a switch whose wrong
 * answer costs a second; this is the text a stranger reads before deciding
 * whether to hand someone their training, and showing it saved when it was
 * not is worse than making the coach wait for the round trip.
 *
 * The invalidation is wide because the name is: it appears on the settings
 * hero, on the client's coach card, and in the code lookup a client runs
 * before attaching.
 */
export function useSaveCoachProfileMutation(): UseMutationResult<
  void,
  Error,
  ApiCoachProfileForm
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: putCoachProfileForm,
    onSuccess: (_result, input) => {
      queryClient.setQueryData(queryKeys.coachProfileForm, input);
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachProfile });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}
