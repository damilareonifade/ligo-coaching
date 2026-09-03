import {
  DETACH_CONFIRM_TITLE,
  DETACH_CONSEQUENCES,
  DETACH_DISMISS_TITLE,
  detachBody,
  detachTitle,
} from '@/lib/detach';

describe('detach copy', () => {
  it('names the coach in the question', () => {
    expect(detachTitle('Sam Okafor')).toBe('Detach from Sam Okafor?');
  });

  it('promises immediacy and retention in the same breath', () => {
    expect(detachBody('Sam Okafor')).toBe(
      'Sam Okafor loses all access the moment you confirm. You keep everything.',
    );
  });

  it('names the confirm for what it protects, not what it ends', () => {
    expect(DETACH_CONFIRM_TITLE).toBe('Detach and keep my data');
    expect(DETACH_DISMISS_TITLE).toBe('Stay attached');
  });
});

describe('detach consequences', () => {
  it('answers all four questions a leaving client asks', () => {
    expect(DETACH_CONSEQUENCES.map((row) => row.id)).toEqual([
      'access',
      'data',
      'programs',
      'thread',
    ]);
  });

  it('leads with the thing they came for', () => {
    expect(DETACH_CONSEQUENCES[0]).toEqual({
      id: 'access',
      title: 'Access ends immediately',
      body: 'Workouts, nutrition and metrics stop being visible.',
    });
  });

  /* "You keep everything" is a claim about four separate things, so it is
     made as four rows rather than one reassuring sentence. */
  it('says exactly what stays', () => {
    const bodies = Object.fromEntries(
      DETACH_CONSEQUENCES.map((row) => [row.id, row.body]),
    );

    expect(bodies.data).toBe('Sessions, meals, measurements and photos are untouched.');
    expect(bodies.programs).toBe('Anything published to you is still yours to follow.');
    expect(bodies.thread).toBe('History stays readable, but nothing new can be sent.');
  });

  it('gives every row a title and a body', () => {
    for (const row of DETACH_CONSEQUENCES) {
      expect(row.title.length).toBeGreaterThan(0);
      expect(row.body.length).toBeGreaterThan(0);
    }
  });
});
