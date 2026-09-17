import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { timing, useMotion } from '@/theme/motion';

export interface LICollapsibleProps {
  readonly open: boolean;
  readonly children: ReactNode;
  readonly testID?: string;
}

/**
 * A panel that opens and closes in place.
 *
 * `{open ? <Panel /> : null}` is not a dropdown, it is a cut: the row it
 * lives in is one height on one frame and another height on the next, and
 * everything below it jumps. A fade does not fix that either — the content
 * softens while the layout still snaps, which reads worse than the cut did,
 * because now two things are disagreeing about when it happened.
 *
 * So the height is what animates. The children stay mounted at their natural
 * size inside a container that clips them, and the container's height runs
 * between zero and whatever they measured.
 *
 * Mounted rather than unmounted while closed, which is the trade this makes:
 * a little layout work for a panel nobody is looking at, in exchange for a
 * height to animate *to* on the frame the panel opens — there is nothing to
 * measure on something that does not exist yet — and for the fields keeping
 * what was typed into them when it closes and opens again.
 */
export function LICollapsible({ open, children, testID }: LICollapsibleProps) {
  const { reduced } = useMotion();
  const progress = useSharedValue(open ? 1 : 0);
  const measured = useSharedValue(0);

  useEffect(() => {
    const target = open ? 1 : 0;
    progress.value = reduced ? target : withTiming(target, timing.base);
  }, [open, progress, reduced]);

  const style = useAnimatedStyle(() => {
    // Nothing measured yet — the very first frame, before the children have
    // been through layout once. Auto height here means the panel opens
    // without animating rather than not opening at all, which is the right
    // way round for a failure that leaves no trace.
    if (measured.value === 0) return { height: open ? undefined : 0, opacity: open ? 1 : 0 };
    return { height: measured.value * progress.value, opacity: progress.value };
  }, [open]);

  return (
    <Animated.View
      style={[styles.clip, style]}
      // Closed, it is zero pixels tall but its children are still in the
      // tree. Without this a screen reader walks into fields nobody can see
      // and a stray tap lands on one.
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      testID={testID}
    >
      {/*
        Absolutely positioned, and that is the whole trick.

        As an ordinary child it would be measured *inside* a parent this
        component has just pinned to zero height, so it reported zero, and a
        height of `0 × progress` is zero however far the animation runs. The
        panel opened to nothing. Taken out of the flow it is laid out against
        the parent's width and sizes itself to its own content, which is the
        number there is any point animating to.
      */}
      <View
        style={styles.measure}
        onLayout={(event) => {
          measured.value = event.nativeEvent.layout.height;
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}

/**
 * `StyleSheet` for the one element that cannot take a class: NativeWind does
 * not resolve `className` on anything Reanimated wraps. The clip is the whole
 * mechanism — without it the children spill out of the collapsed container at
 * full height and nothing appears to close at all.
 */
const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  /**
   * `right: 0` as well as `left: 0`, so the children get the full width of
   * the row they are in. Absolute with neither would shrink them to their own
   * content, and a field that is meant to fill the card would end up as wide
   * as its placeholder.
   */
  measure: { position: 'absolute', top: 0, left: 0, right: 0 },
});
