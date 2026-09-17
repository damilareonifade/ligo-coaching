import { act, render, screen } from '@testing-library/react-native';
import { Appearance, StyleSheet } from 'react-native';

import { SplashOverlay } from '@/components/chrome/SplashOverlay';
import colors from '@/theme/colors';

// `require`, not `import`: the assets are what the component itself requires,
// and comparing module registrations is the only way to tell which of the two
// wordmarks it rendered. app.json comes the same way — `resolveJsonModule` is
// off, and this is the file that has to read it.
const appConfig = require('../../../../app.json');
const WHITE_WORDMARK = require('../../../../assets/brand/SetTrack-wordmark-white.png');
const VIOLET_WORDMARK = require('../../../../assets/brand/SetTrack-wordmark-violet.png');

function splashPluginConfig(): Record<string, never> & {
  image: string;
  backgroundColor: string;
  dark: { image: string; backgroundColor: string };
} {
  const plugin = (appConfig.expo.plugins as unknown[]).find(
    (entry): entry is [string, Record<string, never>] =>
      Array.isArray(entry) && entry[0] === 'expo-splash-screen',
  );
  if (!plugin) throw new Error('expo-splash-screen is not configured in app.json');
  return plugin[1] as never;
}

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

describe('SplashOverlay palettes', () => {
  function withScheme(scheme: 'light' | 'dark') {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue(scheme);
  }

  function curtainColor(): unknown {
    return StyleSheet.flatten(screen.getByTestId('splash-curtain').props.style).backgroundColor;
  }

  /** `expo-image` normalises `source` to a list, so flatten before matching. */
  function wordmarkSource(): unknown[] {
    return [screen.getByLabelText('SetTrack').props.source].flat();
  }

  it('paints the brand violet under the white wordmark on a light phone', async () => {
    withScheme('light');
    await render(<SplashOverlay ready onComplete={jest.fn()} />);

    expect(curtainColor()).toBe(colors.light.violet);
    expect(wordmarkSource()).toContainEqual(WHITE_WORDMARK);
    expect(wordmarkSource()).not.toContainEqual(VIOLET_WORDMARK);
  });

  it('paints the dark ground under the violet wordmark on a dark phone', async () => {
    withScheme('dark');
    await render(<SplashOverlay ready onComplete={jest.fn()} />);

    expect(curtainColor()).toBe(colors.dark.background);
    expect(wordmarkSource()).toContainEqual(VIOLET_WORDMARK);
    expect(wordmarkSource()).not.toContainEqual(WHITE_WORDMARK);
  });

  /**
   * The one duplicated colour in the codebase, pinned.
   *
   * `app.json` configures the *native* splash and cannot require `colors.js`,
   * so the two are kept equal by hand. When they drift the symptom is a flash
   * of the wrong colour at the handover — on a cold start, for a frame, on
   * somebody else's phone. Nothing catches that but this.
   */
  it('matches the native splash configured in app.json', () => {
    const splash = splashPluginConfig();

    expect(splash.backgroundColor.toUpperCase()).toBe(colors.light.violet.toUpperCase());
    expect(splash.dark.backgroundColor.toUpperCase()).toBe(colors.dark.background.toUpperCase());
    expect(splash.image).toContain('SetTrack-wordmark-white');
    expect(splash.dark.image).toContain('SetTrack-wordmark-violet');
  });
});
