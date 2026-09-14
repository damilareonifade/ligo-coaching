import type { ApiSettingsGroup } from '@/api/types';

import { coachHeadline } from './coachProfile';

/* ------------------------------------------------------------------ *
 * The coach's settings rows.
 *
 * Chrome — labels, descriptions and the routes they open — composed on
 * the device rather than fetched, for the same reason the client's are
 * in `buildProfileGroups`: navigation structure is not data. Fetching
 * it means the screen cannot render offline and a copy change becomes a
 * deploy. Only the two numbers in it come from the server.
 * ------------------------------------------------------------------ */

/**
 * The specialties a coach can claim.
 *
 * One list, because two screens set the same column: onboarding's
 * `CoachProfileStep` and the settings editor. If the editor's list were
 * shorter, opening it would silently drop whatever onboarding had saved that
 * it could not render — the chips are the whole value, not a filter over it.
 */
export const COACH_SPECIALTIES = [
  'Strength',
  'Hypertrophy',
  'Weight loss',
  'Mobility',
] as const;

export interface CoachSettingsInput {
  readonly inviteCode: string;
  readonly labelCount: number;
}

export function buildCoachSettingsGroups({
  inviteCode,
  labelCount,
}: CoachSettingsInput): readonly ApiSettingsGroup[] {
  return [
    {
      id: 'coaching',
      title: 'COACHING',
      rows: [
        {
          id: 'invite-code',
          label: 'Invite code',
          desc: 'Share it to take on a client',
          value: inviteCode,
        },
        {
          id: 'labels',
          label: 'Labels',
          desc: 'Organise your roster',
          value: `${labelCount}`,
          route: '/roster/labels',
        },
      ],
    },
    {
      id: 'account',
      title: 'ACCOUNT',
      rows: [
        {
          id: 'profile',
          label: 'Profile',
          desc: 'Gym, bio and specialties — what a client reads before attaching',
          route: '/coach/profile',
        },
        // Billing is gone rather than stubbed. There is no plan, no provider
        // and no decision behind one, and a row that opens nothing teaches a
        // coach not to trust the rows that do.
      ],
    },
    {
      id: 'support',
      title: 'SUPPORT',
      rows: [
        { id: 'help', label: 'Help centre', desc: 'Guides and answers' },
        { id: 'sign-out', label: 'Sign out', desc: '', danger: true },
      ],
    },
  ];
}

/**
 * "Strength coach · Ironworks Lagos · 17 clients".
 *
 * Built from the same three fields a client reads when they look up the invite
 * code, so a coach recognises their own card. Each part is dropped rather than
 * faked when it is missing — a coach who has not filled in a gym gets
 * "Coach · 4 clients", not "Coach · — · 4 clients".
 *
 * The count goes through `coachHeadline` so there is one pluralisation rule,
 * with one exception: a coach on their first day reads "no clients yet"
 * rather than "0 clients", because this is their own screen and the number is
 * a to-do, not a statistic.
 */
export function coachSettingsHeadline(
  specialties: readonly string[],
  gym: string,
  clientCount: number,
): string {
  const parts = [specialties[0] ? `${specialties[0]} coach` : 'Coach'];
  if (gym.trim().length > 0) parts.push(gym.trim());
  const prefix = parts.join(' · ');
  return clientCount > 0 ? coachHeadline(prefix, clientCount) : `${prefix} · no clients yet`;
}
