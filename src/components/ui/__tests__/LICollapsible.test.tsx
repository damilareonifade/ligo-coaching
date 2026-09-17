import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { LICollapsible, LIText } from '@/components/ui';

function panelStyle(): Record<string, unknown> {
  const panel = screen.getByTestId('panel', { includeHiddenElements: true });
  return (StyleSheet.flatten(panel.props.style) ?? {}) as Record<string, unknown>;
}

describe('LICollapsible', () => {
  it('keeps its children mounted while closed', async () => {
    // The trade this component makes. A panel that is unmounted has no
    // height to open to on the frame it appears, and fields inside one lose
    // what was typed into them every time it shuts.
    await render(
      <LICollapsible open={false}>
        <LIText text="Sets" />
      </LICollapsible>,
    );

    // `includeHiddenElements` because the default query respects exactly the
    // accessibility hiding asserted below — the children being filtered out
    // of a normal query is itself the evidence that it works.
    expect(screen.getByText('Sets', { includeHiddenElements: true })).toBeTruthy();
  });

  it('hides those children from touch and from a screen reader while closed', async () => {
    // Which is the price of keeping them mounted: at zero pixels tall they
    // are still in the tree, and without this a reader walks into fields
    // nobody can see.
    await render(
      <LICollapsible open={false} testID="panel">
        <LIText text="Sets" />
      </LICollapsible>,
    );

    const panel = screen.getByTestId('panel', { includeHiddenElements: true });
    expect(panel.props.pointerEvents).toBe('none');
    expect(panel.props.accessibilityElementsHidden).toBe(true);
    expect(panel.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  /**
   * `onLayout` never fires under Jest, so the content is never measured here
   * — which makes this the exact case the fallback exists for, and the one
   * that shipped broken. The first version pinned the height to `measured ×
   * progress`; with nothing measured that is zero however far the animation
   * runs, and the panel opened to nothing at all.
   */
  it('opens to auto height when the content was never measured', async () => {
    await render(
      <LICollapsible open testID="panel">
        <LIText text="Sets" />
      </LICollapsible>,
    );

    // `undefined` is the layout engine's own height, not a missing style:
    // unmeasured and open must mean visible, animated or not.
    expect(panelStyle().height).toBeUndefined();
    expect(panelStyle().opacity).toBe(1);
  });

  it('stays shut when it is closed and unmeasured', async () => {
    await render(
      <LICollapsible open={false} testID="panel">
        <LIText text="Sets" />
      </LICollapsible>,
    );

    expect(panelStyle().height).toBe(0);
    expect(panelStyle().opacity).toBe(0);
  });

  /*
   * There is no test here for the measured path — opening to the height the
   * content reported — and it is not for want of trying. Reproducing it needs
   * a real layout pass to produce the measurement and Reanimated's UI-thread
   * clock to consume it, and Jest has neither: `onLayout` never fires, and a
   * shared value written from a test does not re-run the style that reads it.
   *
   * Which is exactly how the broken version got through. The fallback above
   * is the guard that came out of it: measurement can fail and the panel
   * still opens.
   */

  it('gives them back once open', async () => {
    await render(
      <LICollapsible open testID="panel">
        <LIText text="Sets" />
      </LICollapsible>,
    );

    const panel = screen.getByTestId('panel');
    expect(panel.props.pointerEvents).toBe('auto');
    expect(panel.props.accessibilityElementsHidden).toBe(false);
    expect(panel.props.importantForAccessibility).toBe('auto');
  });
});
