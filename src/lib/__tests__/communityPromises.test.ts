import { GROUP_HIDDEN_ALWAYS, GROUP_VISIBLE_TO_MEMBERS } from '@/lib/community';

/**
 * These two lists are read out on the screen where somebody decides whether to
 * join a group, so they are claims about behaviour rather than copy. Asserted
 * word for word, like the other promises in this file's sibling — a later edit
 * that softens one should have to change a test that says so.
 */
describe('what joining a group discloses', () => {
  it('promises exactly what members can see', () => {
    expect(GROUP_VISIBLE_TO_MEMBERS).toEqual([
      'Your display name and the messages you send',
      'When you are active in the group',
    ]);
  });

  it('promises exactly what stays private', () => {
    expect(GROUP_HIDDEN_ALWAYS).toEqual([
      'Your workouts, meals and measurements',
      'Your check-ins and photos',
      'Your real name, unless you choose it',
    ]);
  });

  it('claims nothing about who coaches whom', () => {
    // It used to say "That you are coached by Sam". False of a group two
    // clients made between themselves — and nothing in the schema tells one
    // member who coaches another. `group_members.is_coach` says whether
    // somebody is a coach, never whose.
    const everything = [...GROUP_VISIBLE_TO_MEMBERS, ...GROUP_HIDDEN_ALWAYS].join(' ');

    expect(everything).not.toMatch(/coach/i);
  });

  it('never names a person, because a group need not have one', () => {
    for (const line of [...GROUP_VISIBLE_TO_MEMBERS, ...GROUP_HIDDEN_ALWAYS]) {
      expect(line).not.toMatch(/\bSam\b/);
    }
  });
});
