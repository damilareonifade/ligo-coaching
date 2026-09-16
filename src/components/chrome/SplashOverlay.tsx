import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
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
import { tokens } from '@/theme/tokens';

/**
 * The static palette, not `useThemeTokens()`, and deliberately so: this field
 * has to be the exact colour the native splash was already painting, and
 * `app.json` can only name one. The wordmark is the white cut, which needs
 * the darker violet under it — dark mode's lifted `#A78BFA` would wash it out.
 * The splash is fixed brand chrome; the theme starts at the screen behind it.
 */
const WORDMARK = require('../../../assets/brand/SetTrack-wordmark-white.png');

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
 * The native splash paints the same violet and the same wordmark at the same
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
      {/*
        Wider than the screen by SIDE_EXCESS on each side, and its two top
        radii add up to the full width, so the top edge is one clean
        semicircle. It sits ARCH_DEPTH above the viewport at rest, which is
        what keeps the first frame a flat, full-bleed field of colour.
      */}
      <Animated.View style={[styles.curtain, { backgroundColor: tokens.violet }, curtainStyle]} />
      <Animated.View style={[styles.mark, markStyle]}>
        {/* `bg-transparent` because LIImage defaults to a sunken-surface fill,
            which would show as a grey plate behind a wordmark that is mostly
            alpha. `transition={0}` because the fade here is ours, not
            expo-image's — two of them would cross. */}
        <LIImage
          source={WORDMARK}
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
