import { act, render, screen } from '@testing-library/react-native';

import { SplashOverlay } from '@/components/chrome/SplashOverlay';

let mockReducedMotion = true;

// Reduce Motion is the deterministic path: the handover runs on a plain
// timer rather than on Reanimated's UI-thread clock, which Jest has no frames
// to drive. What is under test here is when the overlay is allowed to leave,
// and that gate is the same either way.
// `__esModule` is non-enumerable on the real module, so spreading it drops the
// flag and Babel's interop then hands `Animated` the whole namespace instead of
// its default export — which is how `Animated.View` ends up undefined.
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return { __esModule: true, ...actual, useReducedMotion: () => mockReducedMotion };
});

beforeEach(() => {
  mockReducedMotion = true;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SplashOverlay', () => {
  it('shows the brand while it is up', async () => {
    await render(<SplashOverlay ready onComplete={jest.fn()} />);

    // The wordmark carries the name; nothing on this screen is text.
    expect(screen.getByLabelText('SetTrack')).toBeTruthy();
  });

  it('does not hand over while the app is still loading', async () => {
    const onComplete = jest.fn();
    await render(<SplashOverlay ready={false} onComplete={onComplete} />);

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('hands over once the app is ready', async () => {
    const onComplete = jest.fn();
    const view = await render(<SplashOverlay ready={false} onComplete={onComplete} />);

    await view.rerender(<SplashOverlay ready onComplete={onComplete} />);

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
