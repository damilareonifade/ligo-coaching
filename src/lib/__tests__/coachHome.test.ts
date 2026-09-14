import type { ApiCoachHome, ApiLiveClient, ApiRosterClient } from '@/api/types';
import { coachHomeSubtitle } from '@/lib/coachHome';

const live = (id: string): ApiLiveClient => ({
  clientId: id,
  name: id,
  initials: 'XX',
  meta: 'Upper A · 12 min in',
  progress: '4 of 12 sets',
});

const waiting = (id: string): ApiRosterClient =>
  ({ id, name: id, attention: 'review' }) as ApiRosterClient;

function home(partial: Partial<ApiCoachHome>): ApiCoachHome {
  return { training: [], needsALook: [], rosterCount: 4, ...partial };
}

/**
 * The line that replaced "4 sessions on the board today" — a schedule this app
 * does not have. It says one thing, and the order is the point.
 */
describe('coachHomeSubtitle', () => {
  it('leads with whoever is actually training', () => {
    expect(coachHomeSubtitle(home({ training: [live('a')] }))).toBe(
      'One client training now.',
    );
    expect(
      coachHomeSubtitle(home({ training: [live('a'), live('b')], needsALook: [waiting('c')] })),
    ).toBe('2 clients training now.');
  });

  it('falls back to who is waiting, only when nobody is on the floor', () => {
    expect(coachHomeSubtitle(home({ needsALook: [waiting('a')] }))).toBe(
      'One client wants a look.',
    );
  });

  it('says so plainly when nothing needs them', () => {
    expect(coachHomeSubtitle(home({}))).toBe('Nobody needs you right now.');
  });

  it('distinguishes a quiet roster from an empty one', () => {
    expect(coachHomeSubtitle(home({ rosterCount: 0 }))).toBe('No clients yet.');
  });
});
