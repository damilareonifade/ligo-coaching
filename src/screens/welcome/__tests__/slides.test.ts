import {
  WELCOME_SLIDES,
  WELCOME_SLIDE_COUNT,
  WELCOME_TRACKS,
  nextSlideIndex,
  toWelcomeTrack,
} from '@/screens/welcome/slides';

describe('nextSlideIndex', () => {
  it('walks forward through the slides', () => {
    expect(nextSlideIndex(0, 1)).toBe(1);
    expect(nextSlideIndex(1, 1)).toBe(2);
  });

  it('starts again at the first once past the last', () => {
    expect(nextSlideIndex(WELCOME_SLIDE_COUNT - 1, 1)).toBe(0);
  });

  it('wraps backwards too, so the first leads to the last', () => {
    expect(nextSlideIndex(0, -1)).toBe(WELCOME_SLIDE_COUNT - 1);
  });

  it('never leaves the run of slides, whichever way it is pushed', () => {
    let index = 0;
    for (let step = 0; step < WELCOME_SLIDE_COUNT * 3; step += 1) {
      index = nextSlideIndex(index, step % 2 === 0 ? 1 : -1);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(WELCOME_SLIDE_COUNT);
    }
  });
});

describe('welcome slide data', () => {
  it('has a slide per backdrop on both tracks', () => {
    for (const track of WELCOME_TRACKS) {
      expect(WELCOME_SLIDES[track.value]).toHaveLength(WELCOME_SLIDE_COUNT);
    }
  });
});

describe('toWelcomeTrack', () => {
  it('narrows the segmented control back to a role', () => {
    expect(toWelcomeTrack('coach')).toBe('coach');
    expect(toWelcomeTrack('client')).toBe('client');
  });

  it('falls back to the client, who is the larger audience', () => {
    expect(toWelcomeTrack('something-else')).toBe('client');
  });
});
