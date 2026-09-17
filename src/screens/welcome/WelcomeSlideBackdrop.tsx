import { useEffect, useId } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { LIImage, type LIImageProps } from '@/components/ui';
import { useIsDark, useThemeTokens } from '@/theme/tokens';

import type { WelcomeBackdrop } from './slides';

/** The design's own cross-fade: 300ms on `cubic-bezier(0.16, 1, 0.3, 1)`. */
const FADE_MS = 300;
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * How strongly the glow paints, per palette. Not one number, because the same
 * violet does two different amounts of work depending on what is behind it.
 *
 * On the dark field it has to lift a near-black rectangle, and at anything
 * less than the design's own 0.26 it barely registers. On the light field it
 * is already the brightest thing on screen, and 0.26 there sinks the violet
 * wordmark sitting directly in it to about 2.7:1 — under the 3:1 a graphic
 * needs. 0.16 clears it with the same shape and a lighter hand.
 */
const GLOW_OPACITY = { dark: 0.26, light: 0.16 } as const;

export interface WelcomeSlideBackdropProps {
  readonly backdrop: WelcomeBackdrop;
  readonly active: boolean;
  readonly reducedMotion: boolean;
  /**
   * The slide's photograph, once there is one. Everything above it — the
   * scrim, the glow, the type — is already sized to sit on a photo, so this
   * is the only prop that has to change when the art lands.
   */
  readonly source?: LIImageProps['source'];
}

/**
 * One layer of the welcome carousel's field.
 *
 * All four layers are stacked and only the active one is opaque, rather than
 * the layers sliding: the copy above them moves on its own beat, and a
 * background that slid with it would turn a change of subject into a change
 * of place. It is also the one transition that survives a tap on a dot three
 * slides away without dragging the two in between across the screen.
 */
export function WelcomeSlideBackdrop({
  backdrop,
  active,
  reducedMotion,
  source,
}: WelcomeSlideBackdropProps) {
  const tokens = useThemeTokens();
  const glow = useIsDark() ? GLOW_OPACITY.dark : GLOW_OPACITY.light;
  // `useId` is stable per instance, which is what keeps four stacked layers
  // from all painting the first one's gradient. The colons it puts in the id
  // would break `url(#…)`, so they come out.
  const id = useId().replace(/:/g, '');
  const glowId = `welcome-glow-${id}`;
  const scrimId = `welcome-scrim-${id}`;

  const opacity = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    const target = active ? 1 : 0;
    opacity.value = reducedMotion
      ? target
      : withTiming(target, { duration: FADE_MS, easing: EASE_OUT });
  }, [active, opacity, reducedMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, style]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {source ? (
        <LIImage
          source={source}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={0}
          className="bg-background"
        />
      ) : null}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient
            id={glowId}
            cx={backdrop.originX}
            cy={backdrop.originY}
            rx={backdrop.radiusX}
            ry={backdrop.radiusY}
          >
            <Stop offset="0" stopColor={tokens.violet} stopOpacity={glow} />
            <Stop offset="1" stopColor={tokens.violet} stopOpacity={0} />
          </RadialGradient>
          {/* The screen's own background at four opacities: heavy at the very
              top so the status bar stays readable, light through the quarter
              where the wordmark sits, then closing to solid at the foot so
              the account block below has nothing to butt against.

              It veils rather than darkens — on the light palette it is a pale
              wash and on the dark one a shade, which is what keeps the type
              legible over photography in either. Over the bare field it is
              the same colour as what is under it and does nothing at all. */}
          <LinearGradient id={scrimId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tokens.background} stopOpacity={0.74} />
            <Stop offset="0.24" stopColor={tokens.background} stopOpacity={0.34} />
            <Stop offset="0.6" stopColor={tokens.background} stopOpacity={0.58} />
            <Stop offset="1" stopColor={tokens.background} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${scrimId})`} />
        {/* Above the scrim, not under it. The glow hangs at the top of the
            field and the scrim is at its heaviest there — 0.74 — so beneath
            it the light would arrive three-quarters spent, in exactly the
            band it exists to warm. */}
        <Rect width="100%" height="100%" fill={`url(#${glowId})`} />
      </Svg>
    </Animated.View>
  );
}
