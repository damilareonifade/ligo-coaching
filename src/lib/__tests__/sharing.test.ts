import { SHARE_DOMAINS } from '@/api/types';
import {
  accessRequestBody,
  accessRequestTitle,
  SHARE_DOMAIN_COPY,
  shareDomainCopy,
} from '@/lib/sharing';

/**
 * The vocabulary the whole permission model is written in. The point of these
 * is not that the strings are pretty — it is that there is exactly one of each
 * and every domain has one, because a coach can ask for any of them.
 */
describe('share domain copy', () => {
  it('covers every domain, with nothing left to invent at a call site', () => {
    expect(SHARE_DOMAIN_COPY.map((entry) => entry.key)).toEqual([...SHARE_DOMAINS]);
  });

  it('gives each one a title and a description of what it actually shares', () => {
    for (const domain of SHARE_DOMAINS) {
      const copy = shareDomainCopy(domain);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.body.length).toBeGreaterThan(0);
    }
  });

  it('reads as a sentence, not a label dropped into one', () => {
    expect(accessRequestTitle('Sam', 'health')).toBe(
      'Sam is asking to see your health profile',
    );
    expect(accessRequestTitle('Sam', 'nutrition')).toBe('Sam is asking to see your nutrition');
  });

  it('says on every card that no is a complete answer', () => {
    for (const domain of SHARE_DOMAINS) {
      const body = accessRequestBody(domain);
      expect(body).toContain('turn it off again at any time');
      expect(body).toContain('saying no changes nothing else');
    }
  });

  it('describes a domain the same way when asking as when granting', () => {
    // The switch at attach time and the card when a coach asks are the same
    // permission. A client who read one sentence and is shown another has been
    // told two things about what they are agreeing to.
    for (const domain of SHARE_DOMAINS) {
      expect(accessRequestBody(domain).startsWith(shareDomainCopy(domain).body)).toBe(true);
    }
  });
});
