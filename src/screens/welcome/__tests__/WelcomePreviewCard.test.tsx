import { render } from '@testing-library/react-native';

import { WelcomePreviewCard } from '@/screens/welcome/WelcomePreviewCard';
import { WELCOME_SLIDES, type WelcomeMock } from '@/screens/welcome/slides';

/** Every slide's miniature, so a new one cannot quietly break the keying. */
const allMocks: readonly WelcomeMock[] = Object.values(WELCOME_SLIDES)
  .flat()
  .map((slide) => slide.mock);

describe('WelcomePreviewCard', () => {
  it('has slides whose rows repeat a label', () => {
    // The premise of the test below. The live-session slide is three sets of
    // the same lift, which is what a live session looks like — so a row's
    // label is not its identity and cannot be its key.
    const liveSession = WELCOME_SLIDES.coach[2].mock;
    expect(liveSession.rows.filter((row) => row.label === 'Back squat')).toHaveLength(3);
  });

  /**
   * Asserted against the warning rather than against what rendered, because
   * React renders duplicate-keyed siblings anyway — it only says the
   * behaviour is unsupported and may change. Counting rows passes either way;
   * the console is the whole of the symptom.
   *
   * One case per slide rather than a loop in one test: `render` is async in
   * RNTL v14, and several in a single test overlap their `act()` scopes.
   */
  it.each(allMocks.map((mock) => [mock.title, mock] as const))(
    'renders the %s slide without duplicate keys',
    async (_title, mock) => {
      const errors = jest.spyOn(console, 'error').mockImplementation(() => {});

      await render(<WelcomePreviewCard mock={mock} width={220} />);

      const duplicateKeys = errors.mock.calls.filter(
        ([first]) => typeof first === 'string' && first.includes('same key'),
      );
      errors.mockRestore();

      expect(duplicateKeys).toEqual([]);
    },
  );
});
