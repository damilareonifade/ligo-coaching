import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Appearance, Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { LIImage } from '@/components/ui';
import { palettes, type ThemeName } from '@/theme/tokens';

/**
 * One cut of the wordmark per palette — white on the violet field, violet on
 * the dark one. These are brand PNGs with their colour baked in; there is no
 * tint that turns one into the other.
 */
const WORDMARK = {
  light: require('../../../assets/brand/SetTrack-wordmark-white.png'),
  dark: require('../../../assets/brand/SetTrack-wordmark-violet.png'),
} as const;

/**
 * The field each palette paints.
 *
 * **These two values must stay equal to what `app.json` gives
 * expo-splash-screen** — `backgroundColor` and `dark.backgroundColor`. The
 * native splash paints those, this overlay takes over from it with nothing in
 * between, and the handover is only invisible because the colours match. Read
 * from the palette rather than written out so at least this side of the pair
 * cannot drift; the native config is JSON and cannot require a module.
 */
const FIELD: Readonly<Record<ThemeName, string>> = {
  light: palettes.light.violet,
  dark: palettes.dark.background,
};

/**
 * A violet hairline along the arch, dark mode only.
 *
 * The light curtain is violet leaving a near-white screen, so its edge draws
 * itself. The dark one is `background` sweeping off `background` — the same
 * colour the app behind it is painted — and without this the arch that gives
 * the splash its shape would travel the whole height of the screen without
 * ever being visible.
 */
const ARCH_EDGE = 2;

/** The wordmark's own proportions, 1054 × 168. */
const WORDMARK_RATIO = 1054 / 168;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** How far the arch dips from its peak to where it meets the screen edges. */
const ARCH_DEPTH = 50;

/**
 * The radius that produces that dip across this screen's width:
 * `depth = R - sqrt(R² - (W/2)²)`, solved for R.
 */
const ARCH_RADIUS = (SCREEN_W ** 2 / 4 + ARCH_DEPTH ** 2) / (2 * ARCH_DEPTH);

/**
 * The curtain runs this far past each screen edge, so the corners where the
 * arch meets its straight sides stay off-screen. On-screen they read as a
 * kink rather than a curve.
 */
const SIDE_EXCESS = ARCH_RADIUS - SCREEN_W / 2;

/** Far enough down that the arch's peak has cleared the bottom of the screen. */
const TRAVEL = SCREEN_H + ARCH_DEPTH + 20;

const ENTER_MS = 1200;
const HOLD_MS = 800;
const EXIT_MS = 900;
const MARK_EXIT_MS = 800;
const ENTER_SCALE = 0.92;

/** The curtain leaves by moving, not by vanishing — it never fully fades. */
const EXIT_OPACITY = 0.15;

/** Capped so the wordmark does not run edge to edge on a large phone. */
const WORDMARK_W = Math.min(SCREEN_W * 0.62, 280);
const WORDMARK_H = WORDMARK_W / WORDMARK_RATIO;

export interface SplashOverlayProps {
  /**
   * Whether the app behind the overlay can be shown. The curtain will not
   * start leaving until this is true, so the sweep never reveals a blank
   * screen on a cold start with slow fonts or a slow session restore.
   */
  readonly ready: boolean;
  /** Called once the curtain is off-screen and the overlay can be unmounted. */
  readonly onComplete: () => void;
}

/**
 * The splash, after the native one.
 *
 * The native splash paints the same field and the same wordmark at the same
 * width, so handing over to this is invisible: nothing moves at the swap, the
 * wordmark simply blooms in, holds, and the whole field sweeps off the bottom
 * behind a shallow arch.
 *
 * Reanimated rather than `Animated` from react-native, so the sweep runs on
 * the UI thread — this plays while JS is at its busiest, parsing fonts and
 * restoring the session, which is exactly when a JS-driven animation stutters.
 */
export function SplashOverlay({ ready, onComplete }: SplashOverlayProps) {
  const reducedMotion = useReducedMotion();
  const [entryDone, setEntryDone] = useState(reducedMotion);

  /**
   * Which palette the splash paints, frozen at mount.
   *
   * `Appearance`, not the app's own theme setting, because the thing this has
   * to match is the native splash — and the OS drew that from
   * `userInterfaceStyle: automatic` before any JavaScript ran. Somebody who
   * has forced Light while their phone is dark gets the dark splash and then
   * their light app, which is right: the mismatch belongs at the end of the
   * sweep, where it reads as the app arriving, and not at the handover, where
   * it would read as a flash.
   *
   * Frozen because `useAppTheme` calls NativeWind's `setColorScheme` from an
   * effect, and that writes through to `Appearance` — so a live read would
   * repaint the field a frame into the animation.
   */
  const [scheme] = useState<ThemeName>(() =>
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  );

  // The mark's two fades are separate values, multiplied in its style, because
  // each phase runs from its own effect — and a shared value written by one
  // effect while another lists it as a dependency is what `react-hooks`
  // flags. One value per phase keeps each write in the effect that owns it.
  const markEnter = useSharedValue(reducedMotion ? 1 : 0);
  const markExit = useSharedValue(1);
  const markScale = useSharedValue(reducedMotion ? 1 : ENTER_SCALE);
  const curtainY = useSharedValue(0);
  const curtainOpacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;

    markScale.value = withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });
    markEnter.value = withTiming(
      1,
      { duration: ENTER_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setEntryDone)(true);
      },
    );
  }, [markEnter, markScale, reducedMotion]);

  useEffect(() => {
    if (!entryDone || !ready) return;

    // Reduce Motion: the brand still gets its beat, it just does not sweep.
    // The curtain is decoration; the wait it covers is not.
    if (reducedMotion) {
      const timer = setTimeout(onComplete, HOLD_MS);
      return () => clearTimeout(timer);
    }

    markExit.value = withDelay(
      HOLD_MS,
      withTiming(0, { duration: MARK_EXIT_MS, easing: Easing.out(Easing.quad) }),
    );
    curtainOpacity.value = withDelay(
      HOLD_MS,
      withTiming(EXIT_OPACITY, { duration: EXIT_MS, easing: Easing.in(Easing.quad) }),
    );
    curtainY.value = withDelay(
      HOLD_MS,
      withTiming(TRAVEL, { duration: EXIT_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onComplete)();
      }),
    );
  }, [curtainOpacity, curtainY, entryDone, markExit, onComplete, ready, reducedMotion]);

  const curtainStyle = useAnimatedStyle(() => ({
    opacity: curtainOpacity.value,
    transform: [{ translateY: curtainY.value }],
  }));

  const markStyle = useAnimatedStyle(() => ({
    opacity: markEnter.value * markExit.value,
    transform: [{ scale: markScale.value }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} testID="splash-overlay">
      <StatusBar style="light" />
      {/* The same shape as the curtain, two pixels higher and painted violet,
          so all that shows of it is an arc along the leading edge. A layer
          rather than a `borderTopWidth`, because the border would have to
          follow a radius of several thousand pixels and that is not a corner
          any platform draws reliably. */}
      {scheme === 'dark' ? (
        <Animated.View
          style={[
            styles.curtain,
            styles.archEdge,
            { backgroundColor: palettes.dark.violet },
            curtainStyle,
          ]}
        />
      ) : null}
      {/*
        Wider than the screen by SIDE_EXCESS on each side, and its two top
        radii add up to the full width, so the top edge is one clean
        semicircle. It sits ARCH_DEPTH above the viewport at rest, which is
        what keeps the first frame a flat, full-bleed field of colour.
      */}
      <Animated.View
        style={[styles.curtain, { backgroundColor: FIELD[scheme] }, curtainStyle]}
        testID="splash-curtain"
      />
      <Animated.View style={[styles.mark, markStyle]}>
        {/* `bg-transparent` because LIImage defaults to a sunken-surface fill,
            which would show as a grey plate behind a wordmark that is mostly
            alpha. `transition={0}` because the fade here is ours, not
            expo-image's — two of them would cross. */}
        <LIImage
          source={WORDMARK[scheme]}
          style={{ width: WORDMARK_W, height: WORDMARK_H }}
          className="bg-transparent"
          contentFit="contain"
          transition={0}
          accessibilityLabel="SetTrack"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  curtain: {
    position: 'absolute',
    top: -ARCH_DEPTH,
    left: -SIDE_EXCESS,
    right: -SIDE_EXCESS,
    height: SCREEN_H + ARCH_DEPTH,
    borderTopLeftRadius: ARCH_RADIUS,
    borderTopRightRadius: ARCH_RADIUS,
  },
  archEdge: {
    top: -ARCH_DEPTH - ARCH_EDGE,
  },
  mark: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Optically centred: the wordmark sits a little above the true middle,
    // which is where the eye expects it on a full-bleed field.
    top: SCREEN_H / 2 - WORDMARK_H,
    alignItems: 'center',
  },
});
