import type { ComponentProps } from 'react';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  useReducedMotion,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

/**
 * How this app moves.
 *
 * One vocabulary rather than a number chosen per component, because "smooth"
 * is not a property any single control has — it is the app agreeing with
 * itself. A button that sinks in 90ms beside a sheet that opens in 400ms
 * reads as two apps, however carefully each one was tuned on its own.
 *
 * Everything here is short. This is a tool people use mid-set, between
 * breaths, with a bar racked; motion is here to say *what just happened*, and
 * anything long enough to be admired is long enough to be in the way.
 */

/**
 * The durations, in ms.
 *
 * `fast` is acknowledgement — a press, a tick, a colour changing under a
 * thumb. `base` is the default for anything appearing or leaving. `slow` is
 * for things that cross the screen, and there are deliberately few of those.
 */
export const duration = {
  fast: 140,
  base: 220,
  slow: 320,
} as const;

/**
 * `out` is the design's own curve — fast at the start, settling at the end,
 * which is how something under your finger should behave. `in` is its mirror,
 * for things leaving: they should accelerate away rather than dawdle.
 */
export const easing = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.in(Easing.quad),
} as const;

/**
 * Springs, for anything a finger is on.
 *
 * `press` is stiff and barely overshoots: the point is that it answers
 * instantly, not that it bounces. `settle` is softer, for something coming to
 * rest on its own — a knob, a sheet, a pill sliding under a new selection.
 */
export const spring = {
  press: { damping: 20, stiffness: 400, mass: 0.6 } satisfies WithSpringConfig,
  settle: { damping: 18, stiffness: 180, mass: 0.9 } satisfies WithSpringConfig,
} as const;

export const timing = {
  fast: { duration: duration.fast, easing: easing.out } satisfies WithTimingConfig,
  base: { duration: duration.base, easing: easing.out } satisfies WithTimingConfig,
  leaving: { duration: duration.fast, easing: easing.in } satisfies WithTimingConfig,
} as const;

/**
 * How far a control sinks when pressed.
 *
 * Small on purpose. Below about 0.96 a full-width button looks like it is
 * being pushed through the screen, and the corners visibly detach from the
 * layout around them.
 */
export const PRESS_SCALE = 0.97;

/** And how much it dims, which is what carries the press under Reduce Motion. */
export const PRESS_DIM = 0.1;

/** The `entering`/`exiting` prop type, taken from the component that takes it. */
export type MotionAnimation = ComponentProps<typeof Animated.View>['entering'];

export interface MotionPresets {
  /** Content arriving in place — a card, a panel, a state replacing a skeleton. */
  readonly enter: MotionAnimation;
  /** The same, for something that also travels a little: a toast, a banner. */
  readonly enterDown: MotionAnimation;
  readonly exit: MotionAnimation;
  readonly exitUp: MotionAnimation;
  /**
   * True when the OS asks for less movement. Components that animate a
   * transform by hand check this; the presets above have already answered it
   * by being `undefined`.
   */
  readonly reduced: boolean;
}

const PRESETS: Omit<MotionPresets, 'reduced'> = {
  enter: FadeIn.duration(duration.base).easing(easing.out),
  enterDown: FadeInDown.duration(duration.base).easing(easing.out),
  exit: FadeOut.duration(duration.fast).easing(easing.in),
  exitUp: FadeOutUp.duration(duration.fast).easing(easing.in),
};

const STILL: Omit<MotionPresets, 'reduced'> = {
  enter: undefined,
  enterDown: undefined,
  exit: undefined,
  exitUp: undefined,
};

/**
 * The entrances a component should use, already answering Reduce Motion.
 *
 * Under the setting they are all `undefined`, which is what `entering` and
 * `exiting` take to mean "appear". Handing back nothing rather than a
 * zero-length animation matters: Reanimated still mounts and schedules a
 * zero-length one, and a list of forty rows each scheduling a no-op is work
 * done on behalf of somebody who asked for none of it.
 */
export function useMotion(): MotionPresets {
  const reduced = useReducedMotion();
  return { ...(reduced ? STILL : PRESETS), reduced };
}
