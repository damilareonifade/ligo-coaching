import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { WelcomeCarousel } from '@/screens/welcome/WelcomeCarousel';
import { WELCOME_SLIDES } from '@/screens/welcome/slides';

const client = WELCOME_SLIDES.client;
const coach = WELCOME_SLIDES.coach;

let mockReducedMotion = true;

// Reduce Motion is the deterministic path: the copy's changeover is swapped
// in from a Reanimated completion callback, and Jest has no frames to drive
// that clock. Under the setting the swap is immediate, and what it swaps to
// is the same either way.
// `__esModule` is non-enumerable on the real module, so spreading it drops the
// flag and Babel's interop then hands `Animated` the whole namespace instead of
// its default export — which is how `Animated.View` ends up undefined.
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return { __esModule: true, ...actual, useReducedMotion: () => mockReducedMotion };
});

/** The dots read the live selection, which never waits on the animation. */
function selectedDot(): number {
  const dots = screen.getAllByTestId(/^welcome-dot-\d+$/);
  return dots.findIndex((dot) => dot.props.accessibilityState?.selected === true);
}

beforeEach(() => {
  mockReducedMotion = true;
  // The carousel advances itself on a 5.2s interval; a real timer would keep
  // the jest worker alive past the test that started it.
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('WelcomeCarousel', () => {
  it('opens on the first slide of the track it is given', async () => {
    await render(<WelcomeCarousel track="client" onTrackChange={jest.fn()} />);

    expect(screen.getByText(client[0].headline)).toBeTruthy();
    expect(screen.getByText(client[0].kicker)).toBeTruthy();
  });

  it('tells the coach story when the track changes', async () => {
    const onTrackChange = jest.fn();
    const { rerender } = await render(
      <WelcomeCarousel track="client" onTrackChange={onTrackChange} />,
    );

    // By label: the track control is `LISegmented`, which names its own
    // container but not the individual options.
    await fireEvent.press(screen.getByText('I coach'));
    expect(onTrackChange).toHaveBeenCalledWith('coach');

    // Controlled: the parent owns the track, so the swap only shows once it
    // is handed back down.
    await rerender(<WelcomeCarousel track="coach" onTrackChange={onTrackChange} />);
    expect(screen.getByText(coach[0].headline)).toBeTruthy();
  });

  it('jumps to the slide whose dot was tapped', async () => {
    await render(<WelcomeCarousel track="client" onTrackChange={jest.fn()} />);

    await fireEvent.press(screen.getByTestId('welcome-dot-2'));

    expect(screen.getByText(client[2].headline)).toBeTruthy();
  });

  // One case per track rather than a loop in one test: `render` is async in
  // RNTL v14, and two of them in a single test leave `screen` pointing at a
  // tree that has already been torn down.
  it.each(['client', 'coach'] as const)(
    'changes over one slide at a time on the %s track',
    async (track) => {
      await render(<WelcomeCarousel track={track} onTrackChange={jest.fn()} />);

      for (const [slot, slide] of WELCOME_SLIDES[track].entries()) {
        await fireEvent.press(screen.getByTestId(`welcome-dot-${slot}`));

        // `getByTestId` is the assertion, not just the lookup: it throws on a
        // second match, so this also says the slide that left has left. A
        // cross-fade would have two headlines mounted at once, and this
        // screen is deliberately not doing that.
        expect(screen.getByTestId('welcome-headline')).toHaveTextContent(slide.headline);
        expect(screen.getByTestId('welcome-kicker')).toHaveTextContent(slide.kicker);
      }
    },
  );

  it('holds the copy until the old slide has gone, but selects at once', async () => {
    // With motion on, the swap rides a Reanimated completion callback that
    // Jest has no frames to reach — so "has not changed yet" is exactly what
    // a correctly deferred changeover looks like from here. Made synchronous
    // again, this fails.
    mockReducedMotion = false;
    await render(<WelcomeCarousel track="client" onTrackChange={jest.fn()} />);

    await fireEvent.press(screen.getByTestId('welcome-dot-2'));

    expect(selectedDot()).toBe(2);
    expect(screen.getByTestId('welcome-headline')).toHaveTextContent(client[0].headline);
  });

  it('comes back round to the first slide after the last', async () => {
    mockReducedMotion = false;
    await render(<WelcomeCarousel track="client" onTrackChange={jest.fn()} />);

    // A full lap: four advances from the first slide lands back on it.
    for (let slot = 1; slot < client.length; slot += 1) {
      await act(async () => {
        jest.advanceTimersByTime(5300);
      });
      expect(selectedDot()).toBe(slot);
    }

    await act(async () => {
      jest.advanceTimersByTime(5300);
    });

    expect(selectedDot()).toBe(0);
  });

  it('advances on its own until it is touched', async () => {
    // The only tests that need the animation running, so the only ones that
    // assert on the dots rather than on the copy they select.
    mockReducedMotion = false;
    await render(<WelcomeCarousel track="client" onTrackChange={jest.fn()} />);

    expect(selectedDot()).toBe(0);

    await act(async () => {
      jest.advanceTimersByTime(5300);
    });
    expect(selectedDot()).toBe(1);

    // Taking hold of it stops the timer for good, rather than resuming after
    // a pause and pulling the slide out from under whoever is reading.
    await fireEvent.press(screen.getByTestId('welcome-dot-0'));
    await act(async () => {
      jest.advanceTimersByTime(20000);
    });

    expect(selectedDot()).toBe(0);
  });
});
