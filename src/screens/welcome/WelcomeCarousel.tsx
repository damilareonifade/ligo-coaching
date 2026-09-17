import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LIImage, LISegmented, LIText, type LISegmentedOption } from '@/components/ui';
import { useIsDark } from '@/theme/tokens';

import { WelcomeDots } from './WelcomeDots';
import { WelcomePreviewCard } from './WelcomePreviewCard';
import { WelcomeSlideBackdrop } from './WelcomeSlideBackdrop';
import {
  WELCOME_BACKDROPS,
  WELCOME_SLIDE_COUNT,
  WELCOME_SLIDES,
  WELCOME_TRACKS,
  nextSlideIndex,
  toWelcomeTrack,
  type WelcomeTrack,
} from './slides';

/**
 * Two cuts of the same wordmark, one per palette. The white one is invisible
 * on the light field and the violet one is muddy on the dark one, so the
 * screen picks rather than tinting — these are brand assets with their own
 * colour baked in, and there is no `tintColor` that turns one into the other.
 */
const WORDMARK = {
  dark: require('../../../assets/brand/SetTrack-wordmark-white.png'),
  light: require('../../../assets/brand/SetTrack-wordmark-violet.png'),
} as const;

/** The wordmark's own proportions, 1054 × 168. */
const WORDMARK_RATIO = 1054 / 168;
const WORDMARK_W = 132;

/** How long a slide holds before the carousel moves itself on. */
const AUTOPLAY_MS = 5200;

/** Horizontal travel that counts as a swipe rather than a slipped tap. */
const SWIPE_MIN = 48;

/**
 * The slide's copy leaves before the next one arrives, rather than the two
 * cross-fading.
 *
 * A cross-fade would put two headlines of different lengths on top of each
 * other for a fifth of a second, which on this screen reads as a smear rather
 * than a change. Out first, then in, and the gap between them is what makes
 * it obvious something new has come.
 *
 * Leaving is the shorter half on purpose: the old slide has already been
 * read, and the wait that matters is the one before the new one is legible.
 */
const CONTENT_EXIT_MS = 180;
const CONTENT_ENTER_MS = 260;

/** How far the copy lifts as it goes, and rises from as it returns. */
const CONTENT_LIFT = 8;

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_IN = Easing.in(Easing.quad);

/**
 * Below this the preview card is dropped.
 *
 * Everything else on this screen — the wordmark, the sentence, the account
 * buttons — is load-bearing; the miniature is the one thing that is only
 * showing off. On a 667pt phone it is also the difference between a laid-out
 * screen and a clipped one, so on those it goes and the copy gets the room.
 */
const PREVIEW_MIN_SCREEN_H = 740;

/** `WelcomeTrackOption` is a `LISegmentedOption` with its value narrowed. */
const TRACK_OPTIONS: readonly LISegmentedOption[] = WELCOME_TRACKS;

export interface WelcomeCarouselProps {
  readonly track: WelcomeTrack;
  readonly onTrackChange: (track: WelcomeTrack) => void;
}

/**
 * The welcome screen's field: four backdrops, the pitch over them, and the
 * two controls that move between them.
 *
 * It advances on its own until it is touched, and then stops for good rather
 * than resuming after a pause. Someone who has taken hold of the dots is
 * reading at their own pace, and a carousel that wrests itself back a few
 * seconds later is arguing with them.
 */
export function WelcomeCarousel({ track, onTrackChange }: WelcomeCarouselProps) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const isDark = useIsDark();

  const [index, setIndex] = useState(0);
  // Reduce Motion stops the carousel before it starts: movement nobody asked
  // for is exactly what the setting is about, and every slide is still
  // reachable by tapping a dot.
  const [handedOver, setHandedOver] = useState(reducedMotion);

  /**
   * What the copy is showing, which lags what is selected.
   *
   * `track` and `index` are the answer; this is the question the copy is
   * still finishing. They part company for the length of the exit and meet
   * again when the new slide is swapped in under a hidden layer — which is
   * why the controls can stay on the live values and respond to a tap at
   * once while the sentence takes its time.
   */
  const [shown, setShown] = useState({ track, index: 0 });

  /**
   * Under Reduce Motion the copy is not held back at all — it is read
   * straight off the selection, and `shown` is left out of the answer rather
   * than being kept in step with it. Deferring by a beat is still motion, and
   * the held value only exists to give the animation something to hold.
   */
  const displayed = reducedMotion ? { track, index } : shown;
  const stale = !reducedMotion && (shown.track !== track || shown.index !== index);

  const contentOpacity = useSharedValue(1);
  const contentLift = useSharedValue(0);

  const slides = WELCOME_SLIDES[displayed.track];
  const slide = slides[displayed.index] ?? slides[0];

  const showPreview = screenH >= PREVIEW_MIN_SCREEN_H;
  const previewWidth = Math.min(Math.max(screenW * 0.56, 190), 230);

  useEffect(() => {
    if (handedOver) return;
    const timer = setInterval(() => setIndex((current) => nextSlideIndex(current, 1)), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [handedOver]);

  /**
   * The changeover, driven by one shared value per property so the two halves
   * cannot drift apart mid-sequence.
   *
   * The swap happens in the fade-out's completion callback — the moment the
   * copy is invisible — so the exiting and entering sentences never share the
   * screen and never share a layout pass. The lift jumps the other side of
   * zero in a zero-length step while nothing can be seen, which is what turns
   * one continuous motion into a departure and an arrival.
   */
  useEffect(() => {
    if (!stale) return;

    contentOpacity.value = withSequence(
      withTiming(0, { duration: CONTENT_EXIT_MS, easing: EASE_IN }, (finished) => {
        if (finished) runOnJS(setShown)({ track, index });
      }),
      withTiming(1, { duration: CONTENT_ENTER_MS, easing: EASE_OUT }),
    );
    contentLift.value = withSequence(
      withTiming(-CONTENT_LIFT, { duration: CONTENT_EXIT_MS, easing: EASE_IN }),
      withTiming(CONTENT_LIFT, { duration: 0 }),
      withTiming(0, { duration: CONTENT_ENTER_MS, easing: EASE_OUT }),
    );
  }, [contentLift, contentOpacity, index, reducedMotion, stale, track]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentLift.value }],
  }));

  const goTo = useCallback((next: number) => {
    setHandedOver(true);
    setIndex(next);
  }, []);

  /**
   * Swiping goes round, exactly as autoplay does — one definition of what
   * comes next, so the carousel cannot behave one way on its own and another
   * way under a thumb. Past the last slide is the first again, and back from
   * the first is the last.
   */
  const step = useCallback((delta: number) => {
    setHandedOver(true);
    setIndex((current) => nextSlideIndex(current, delta));
  }, []);

  const handleTrack = useCallback(
    (value: string) => {
      setHandedOver(true);
      onTrackChange(toWelcomeTrack(value));
    },
    [onTrackChange],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Horizontal intent only, and only once it is clearly horizontal —
        // otherwise the gesture eats the taps on the dots sitting inside it.
        .activeOffsetX([-16, 16])
        .failOffsetY([-24, 24])
        // Nothing here is animated from the gesture itself, so the callback
        // has no reason to be a worklet — and on the JS thread it can call
        // `step` directly instead of hopping back over `runOnJS`.
        .runOnJS(true)
        .onEnd((event) => {
          if (event.translationX <= -SWIPE_MIN) step(1);
          else if (event.translationX >= SWIPE_MIN) step(-1);
        }),
    [step],
  );

  return (
    <GestureDetector gesture={pan}>
      <View className="flex-1 overflow-hidden bg-background" testID="welcome-carousel">
        {WELCOME_BACKDROPS.map((backdrop, slot) => (
          <WelcomeSlideBackdrop
            key={slot}
            backdrop={backdrop}
            active={slot === index}
            reducedMotion={reducedMotion}
          />
        ))}

        <View
          className="flex-1 items-center px-7 pb-5"
          style={{ paddingTop: insets.top + 16 }}
          pointerEvents="box-none"
        >
          <View className="items-center gap-3" pointerEvents="none">
            <LIImage
              source={isDark ? WORDMARK.dark : WORDMARK.light}
              style={{ width: WORDMARK_W, height: WORDMARK_W / WORDMARK_RATIO }}
              className="bg-transparent"
              contentFit="contain"
              transition={0}
              accessibilityLabel="SetTrack"
            />
            <LIText
              size="caption"
              color="muted"
              text="COACH · GUIDE · PROGRESS"
              className="font-geist-medium tracking-widest"
            />
            {/* The wordmark and the tagline above are the app's name and hold
                still; everything from here down belongs to the slide and
                leaves with it, which is why the three blocks share one
                animated style rather than each running their own.

                Each animated wrapper is bare and the classes sit on a `View`
                inside it. NativeWind resolves `className` only for components
                in its own registry, and anything Reanimated wraps is a new
                reference it has never seen — a class on one of these is
                dropped without a word. */}
            <Animated.View style={contentStyle}>
              <View className="flex-row items-center gap-2 rounded-pill border border-border bg-surface-sunken py-1 pl-2 pr-3">
                <View className="h-1.5 w-1.5 rounded-pill bg-violet" />
                <LIText
                  size="caption"
                  color="body"
                  text={slide.kicker}
                  className="font-geist-medium"
                  testID="welcome-kicker"
                />
              </View>
            </Animated.View>
          </View>

          <Animated.View style={[styles.previewSlot, contentStyle]} pointerEvents="none">
            <View className="min-h-0 w-full flex-1 items-center justify-center py-4">
              {showPreview ? <WelcomePreviewCard mock={slide.mock} width={previewWidth} /> : null}
            </View>
          </Animated.View>

          <Animated.View style={[styles.fullWidth, contentStyle]} pointerEvents="none">
            <View className="w-full items-center">
              <LIText
                size="h3"
                color="primary"
                text={slide.headline}
                className="text-center font-geist-semibold"
                testID="welcome-headline"
              />
              <LIText
                size="caption"
                color="muted"
                text={slide.body}
                className="pt-2 text-center font-geist"
              />
            </View>
          </Animated.View>

          {/* Width-capped rather than full-bleed: `LISegmented` gives each
              option `flex-1`, and across the whole screen two words would sit
              marooned in the middle of two very wide halves. */}
          <View className="w-56 pt-4">
            <LISegmented
              options={TRACK_OPTIONS}
              value={track}
              onChange={handleTrack}
              testID="welcome-track-toggle"
            />
          </View>

          <View className="pt-3.5">
            <WelcomeDots count={WELCOME_SLIDE_COUNT} index={index} onSelect={goTo} />
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}

/**
 * Layout for the animated wrappers, which cannot take classes. Everything
 * else on this screen still does.
 */
const styles = StyleSheet.create({
  previewSlot: { flex: 1, minHeight: 0, width: '100%' },
  fullWidth: { width: '100%' },
});
