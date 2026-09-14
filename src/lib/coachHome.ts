import type { ApiCoachHome } from '@/api/types';

/**
 * The line under a coach's name.
 *
 * It replaced "4 sessions on the board today", which described a schedule this
 * app does not have. What a coach wants at a glance is whether anyone needs
 * them right now, so training wins over waiting, and waiting wins over quiet.
 *
 * One fact, not three. A subtitle listing every count would be the stats row
 * again, in prose.
 */
export function coachHomeSubtitle(home: ApiCoachHome): string {
  const training = home.training.length;
  if (training > 0) {
    return training === 1 ? 'One client training now.' : `${training} clients training now.`;
  }

  const waiting = home.needsALook.length;
  if (waiting > 0) {
    return waiting === 1 ? 'One client wants a look.' : `${waiting} clients want a look.`;
  }

  return home.rosterCount === 0
    ? 'No clients yet.'
    : 'Nobody needs you right now.';
}
