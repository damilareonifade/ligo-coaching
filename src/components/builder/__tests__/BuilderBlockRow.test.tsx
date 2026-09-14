import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ApiProgramBlock } from '@/api/types';
import BuilderBlockRow from '@/components/builder/BuilderBlockRow';

function block(overrides: Partial<ApiProgramBlock> = {}): ApiProgramBlock {
  return {
    id: 'blk-1',
    name: 'Bench press',
    scheme: '3 × 10',
    rpe: '',
    targetKg: null,
    note: null,
    ...overrides,
  };
}

/**
 * The fields are inline rather than in a bottom sheet, which is the reason
 * this test can exist at all — a sheet renders nothing under Jest, so the
 * editor it held could never be covered.
 */
describe('BuilderBlockRow', () => {
  it('keeps the fields closed until asked', async () => {
    await render(<BuilderBlockRow block={block()} onChange={() => {}} onRemove={() => {}} />);

    expect(screen.queryByTestId('builder-sets-blk-1')).toBeNull();

    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));
    expect(screen.getByTestId('builder-sets-blk-1')).toBeTruthy();
    expect(screen.getByTestId('builder-reps-blk-1')).toBeTruthy();
    expect(screen.getByTestId('builder-kg-blk-1')).toBeTruthy();
    expect(screen.getByTestId('builder-rpe-blk-1')).toBeTruthy();
  });

  it('writes sets and reps back as a scheme', async () => {
    const onChange = jest.fn();
    await render(<BuilderBlockRow block={block()} onChange={onChange} onRemove={() => {}} />);
    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));

    await fireEvent.changeText(screen.getByTestId('builder-sets-blk-1'), '5');
    expect(onChange).toHaveBeenLastCalledWith(
      'blk-1',
      expect.objectContaining({ scheme: '5 × 10' }),
    );

    await fireEvent.changeText(screen.getByTestId('builder-reps-blk-1'), '5');
    expect(onChange).toHaveBeenLastCalledWith(
      'blk-1',
      expect.objectContaining({ scheme: '5 × 5' }),
    );
  });

  it('sets a target weight, and treats a cleared box as none', async () => {
    const onChange = jest.fn();
    await render(<BuilderBlockRow block={block()} onChange={onChange} onRemove={() => {}} />);
    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));

    await fireEvent.changeText(screen.getByTestId('builder-kg-blk-1'), '62.5');
    expect(onChange).toHaveBeenLastCalledWith('blk-1', expect.objectContaining({ targetKg: 62.5 }));

    await fireEvent.changeText(screen.getByTestId('builder-kg-blk-1'), '');
    expect(onChange).toHaveBeenLastCalledWith('blk-1', expect.objectContaining({ targetKg: null }));
  });

  it('sets an RPE', async () => {
    const onChange = jest.fn();
    await render(<BuilderBlockRow block={block()} onChange={onChange} onRemove={() => {}} />);
    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));

    await fireEvent.changeText(screen.getByTestId('builder-rpe-blk-1'), '8');
    expect(onChange).toHaveBeenLastCalledWith('blk-1', expect.objectContaining({ rpe: 'RPE 8' }));
  });

  /** Clearing a box must not silently write a zero-set exercise. */
  it('falls back to what the block held when a field is emptied', async () => {
    const onChange = jest.fn();
    await render(
      <BuilderBlockRow block={block({ scheme: '4 × 8' })} onChange={onChange} onRemove={() => {}} />,
    );
    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));

    await fireEvent.changeText(screen.getByTestId('builder-sets-blk-1'), '');
    expect(onChange).toHaveBeenLastCalledWith(
      'blk-1',
      expect.objectContaining({ scheme: '4 × 8' }),
    );
  });

  it('shows the target weight on the collapsed row', async () => {
    await render(
      <BuilderBlockRow
        block={block({ scheme: '4 × 8', targetKg: 62.5 })}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );

    expect(screen.getByText('4 × 8 · 62.5 kg')).toBeTruthy();
  });

  it('still removes', async () => {
    const onRemove = jest.fn();
    await render(<BuilderBlockRow block={block()} onChange={() => {}} onRemove={onRemove} />);

    await fireEvent.press(screen.getByTestId('builder-remove-blk-1'));
    expect(onRemove).toHaveBeenCalledWith('blk-1');
  });
});

/**
 * The saved-program screen writes through the API, so it cannot save on every
 * keystroke. It uses `onCommit` instead, which fires once the fields close.
 */
describe('BuilderBlockRow — committing on close', () => {
  it('does not commit while the fields are still open', async () => {
    const onCommit = jest.fn();
    await render(
      <BuilderBlockRow
        block={block()}
        onChange={() => {}}
        onCommit={onCommit}
        onRemove={() => {}}
      />,
    );

    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));
    await fireEvent.changeText(screen.getByTestId('builder-sets-blk-1'), '5');
    await fireEvent.changeText(screen.getByTestId('builder-reps-blk-1'), '5');

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('commits once, with everything typed, when they close', async () => {
    const onCommit = jest.fn();
    await render(
      <BuilderBlockRow
        block={block()}
        onChange={() => {}}
        onCommit={onCommit}
        onRemove={() => {}}
      />,
    );

    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));
    await fireEvent.changeText(screen.getByTestId('builder-sets-blk-1'), '5');
    await fireEvent.changeText(screen.getByTestId('builder-reps-blk-1'), '5');
    await fireEvent.changeText(screen.getByTestId('builder-kg-blk-1'), '100');
    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('blk-1', {
      scheme: '5 × 5',
      rpe: '',
      targetKg: 100,
    });
  });

  it('is optional — the draft builder passes none and still works', async () => {
    const onChange = jest.fn();
    await render(<BuilderBlockRow block={block()} onChange={onChange} onRemove={() => {}} />);

    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));
    await fireEvent.changeText(screen.getByTestId('builder-sets-blk-1'), '4');
    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));

    expect(onChange).toHaveBeenCalled();
  });
});
