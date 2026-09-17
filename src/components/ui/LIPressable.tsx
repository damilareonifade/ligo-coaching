import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PRESS_DIM, PRESS_SCALE, spring, timing, useMotion } from '@/theme/motion';

export type LIPressEffect = 'sink' | 'dim' | 'none';

export interface LIPressableProps extends Omit<PressableProps, 'style'> {
  readonly children?: ReactNode;
  readonly className?: string;
  /**
   * `sink` scales and dims — the default, and what a button or a card should
   * do. `dim` only fades, for a target whose edges are pinned to something
   * else and would visibly detach if it moved: a full-bleed row, a segment
   * inside a track. `none` is for a target that shows the press some other
   * way.
   */
  readonly effect?: LIPressEffect;
  /**
   * Stretches the animated wrapper to the full width of its parent.
   *
   * The wrapper sizes to its child by default, which is right for a chip or a
   * badge and wrong for anything the caller has made `w-full` — that class is
   * on the `Pressable` inside, and inside a wrapper that has already shrunk
   * to fit, "full width" is the width it shrank to.
   */
  readonly stretch?: boolean;
}

/**
 * The app's touchable.
 *
 * Every `LI*` control that can be pressed is built on this, so a press feels
 * the same in the roster as it does in a form. It replaces the
 * `active:opacity-80` this codebase used to reach for, which NativeWind
 * applies as a step rather than a transition — the control snapped to 80% and
 * snapped back, and no amount of tuning the number changes that it is a cut,
 * not a movement.
 *
 * The two-element shape is the whole reason this component exists rather than
 * an animated `Pressable`. NativeWind resolves `className` only for
 * components it holds by reference in its own registry — React Native's
 * primitives, and nothing else — and anything Reanimated wraps is a new
 * reference it has never seen. A `className` on one is dropped in silence.
 * So the wrapper takes the animation and no classes, and the `Pressable`
 * inside takes the classes and no animation; each is handed only what it is
 * known to understand.
 *
 * Pressing in is timed and pressing out springs, deliberately. Going down
 * should be immediate, because it is a reply to a finger that has already
 * arrived; coming back up is the control settling on its own, and a spring is
 * what that looks like.
 */
export function LIPressable({
  children,
  className,
  effect = 'sink',
  stretch = false,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: LIPressableProps) {
  const { reduced } = useMotion();
  const pressed = useSharedValue(0);

  // Plain functions rather than `useCallback`: a shared value written inside
  // a memoised callback has to be listed as a dependency, and writing to
  // something the dependency array treats as immutable is what
  // `react-hooks/immutability` exists to catch. There is nothing to memoise
  // here anyway.
  const handlePressIn: NonNullable<PressableProps['onPressIn']> = (event) => {
    pressed.value = withTiming(1, timing.fast);
    onPressIn?.(event);
  };

  const handlePressOut: NonNullable<PressableProps['onPressOut']> = (event) => {
    pressed.value = withSpring(0, spring.press);
    onPressOut?.(event);
  };

  // Reduce Motion takes the sink away but leaves the dim. The setting is
  // about movement, and somebody who asked for less of it has not asked to
  // stop being told that their press landed — so the control still answers,
  // it just answers without moving.
  const style = useAnimatedStyle(() => {
    if (effect === 'none') return {};
    const dim = 1 - pressed.value * PRESS_DIM;
    if (effect === 'dim' || reduced) return { opacity: dim };
    return {
      opacity: dim,
      transform: [{ scale: 1 - pressed.value * (1 - PRESS_SCALE) }],
    };
  }, [effect, reduced]);

  return (
    <Animated.View style={[stretch ? styles.stretch : null, style]}>
      <Pressable
        {...props}
        disabled={disabled}
        onPressIn={disabled ? undefined : handlePressIn}
        onPressOut={disabled ? undefined : handlePressOut}
        className={className}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** The one style the wrapper needs, and it cannot take a class to get it. */
const styles = StyleSheet.create({
  stretch: { alignSelf: 'stretch' },
});
