import type { UserRole } from '@/api/types';

function roleLabel(role: UserRole): string {
  return role === 'coach' ? 'a coach' : 'a client';
}

/**
 * What to say when "create account with Google" turns out to be a sign-in.
 *
 * With OAuth the two are the same act: by the time we know the account
 * exists, Google has already vouched for the person and a session is live.
 * Sending them to the login screen would mean signing them out to press a
 * button that does the identical thing — so they are signed in and simply
 * told what happened.
 *
 * The mismatch case is the one that matters. Someone with a client account
 * who taps "Coach others" and then Google gets a client session, because the
 * database refuses a role change after signup. Without a word about it, the
 * role they picked appears to have been ignored.
 */
export function existingAccountMessage(accountRole: UserRole, chosenRole: UserRole): string {
  if (accountRole === chosenRole) {
    return 'You already have a SetTrack account — signed you in.';
  }

  return `You already have a SetTrack account as ${roleLabel(accountRole)}, so that is where we signed you in. A role is set when the account is created and cannot be changed afterwards.`;
}
