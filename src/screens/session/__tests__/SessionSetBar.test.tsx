import { fireEvent, render, screen } from '@testing-library/react-native';

import SessionSetBar, { type SetEditTarget } from '@/screens/session/SessionSetBar';

function target(overrides: Partial<SetEditTarget> = {}): SetEditTarget {
  return {
    exerciseId: 'cex-bench',
    exerciseName: 'Bench press',
    setN: 2,
    field: 'reps',
    value: 8,
    ...overrides,
  };
}

/**
 * Docked, not presented — so unlike the sheet it replaced, the editor is a
 * plain component and every one of these assertions is reachable.
 */
describe('SessionSetBar', () => {
  it('stays off screen with nothing selected', async () => {
    await render(<SessionSetBar target={null} onChange={() => {}} onDone={() => {}} />);

    expect(screen.queryByTestId('session-set-bar')).toBeNull();
  });

  it('names the exercise and set it is pointed at', async () => {
    await render(<SessionSetBar target={target()} onChange={() => {}} onDone={() => {}} />);

    expect(screen.getByText('Bench press · set 2')).toBeTruthy();
    expect(screen.getByText('Saved as yours')).toBeTruthy();
  });

  it('steps reps by one', async () => {
    const onChange = jest.fn();
    await render(<SessionSetBar target={target()} onChange={onChange} onDone={() => {}} />);

    await fireEvent.press(screen.getByTestId('set-bar-increase'));
    expect(onChange).toHaveBeenLastCalledWith(9);

    await fireEvent.press(screen.getByTestId('set-bar-decrease'));
    expect(onChange).toHaveBeenLastCalledWith(7);
  });

  it('steps load by a plate pair, not by one', async () => {
    const onChange = jest.fn();
    await render(
      <SessionSetBar
        target={target({ field: 'weight', value: 60 })}
        onChange={onChange}
        onDone={() => {}}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-bar-increase'));
    expect(onChange).toHaveBeenLastCalledWith(62.5);
  });

  it('will not step a load below zero', async () => {
    const onChange = jest.fn();
    await render(
      <SessionSetBar
        target={target({ field: 'weight', value: 0 })}
        onChange={onChange}
        onDone={() => {}}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-bar-decrease'));
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  /** The whole reason the two are edited apart — see the helper line. */
  it('says which field it is editing, and why they are separate', async () => {
    await render(<SessionSetBar target={target()} onChange={() => {}} onDone={() => {}} />);
    expect(screen.getByText(/^Reps only\./)).toBeTruthy();

    await render(
      <SessionSetBar target={target({ field: 'weight' })} onChange={() => {}} onDone={() => {}} />,
    );
    expect(screen.getByText(/^Load only\./)).toBeTruthy();
  });

  it('closes on Done', async () => {
    const onDone = jest.fn();
    await render(<SessionSetBar target={target()} onChange={() => {}} onDone={onDone} />);

    await fireEvent.press(screen.getByTestId('set-bar-done'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('takes a number typed straight in', async () => {
    const onChange = jest.fn();
    await render(<SessionSetBar target={target()} onChange={onChange} onDone={() => {}} />);

    await fireEvent.changeText(screen.getByTestId('set-bar-value'), '12');
    expect(onChange).toHaveBeenLastCalledWith(12);
  });

  it('takes a half-plate load typed in, comma or point', async () => {
    const onChange = jest.fn();
    await render(
      <SessionSetBar
        target={target({ field: 'weight', value: 60 })}
        onChange={onChange}
        onDone={() => {}}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('set-bar-value'), '97.5');
    expect(onChange).toHaveBeenLastCalledWith(97.5);

    await fireEvent.changeText(screen.getByTestId('set-bar-value'), '82,5');
    expect(onChange).toHaveBeenLastCalledWith(82.5);
  });

  /** Backspacing to empty on the way to a new number must not log a zero. */
  it('writes nothing while the box is empty or unparseable', async () => {
    const onChange = jest.fn();
    await render(<SessionSetBar target={target()} onChange={onChange} onDone={() => {}} />);

    await fireEvent.changeText(screen.getByTestId('set-bar-value'), '');
    await fireEvent.changeText(screen.getByTestId('set-bar-value'), '-');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps what was typed in the box rather than snapping back', async () => {
    await render(<SessionSetBar target={target()} onChange={() => {}} onDone={() => {}} />);

    await fireEvent.changeText(screen.getByTestId('set-bar-value'), '');
    expect(screen.getByTestId('set-bar-value').props.value).toBe('');
  });

  it('a stepper press takes the box back over whatever was typed', async () => {
    const onChange = jest.fn();
    await render(<SessionSetBar target={target()} onChange={onChange} onDone={() => {}} />);

    await fireEvent.changeText(screen.getByTestId('set-bar-value'), '');
    await fireEvent.press(screen.getByTestId('set-bar-increase'));

    expect(onChange).toHaveBeenLastCalledWith(9);
    expect(screen.getByTestId('set-bar-value').props.value).toBe('8');
  });

  it('closes on the keyboard return key too', async () => {
    const onDone = jest.fn();
    await render(<SessionSetBar target={target()} onChange={() => {}} onDone={onDone} />);

    await fireEvent(screen.getByTestId('set-bar-value'), 'submitEditing');
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
