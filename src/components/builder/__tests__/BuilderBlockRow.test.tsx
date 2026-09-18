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

  /**
   * RPE is parked, not removed — `RPE_PRESCRIBING`. Nothing asks for one, and
   * a block that already carries one keeps it rather than having it dropped by
   * the next unrelated edit.
   */
  it('no longer asks for an RPE, and does not discard one already set', async () => {
    const onChange = jest.fn();
    await render(
      <BuilderBlockRow
        block={block({ rpe: 'RPE 8' })}
        onChange={onChange}
        onRemove={() => {}}
      />,
    );
    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));

    expect(screen.queryByTestId('builder-rpe-blk-1')).toBeNull();

    await fireEvent.changeText(screen.getByTestId('builder-sets-blk-1'), '5');
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
      // Sent even though a bench press has neither: the save replaces the
      // block, so a field left out of the patch is a field cleared.
      targetDistanceKm: null,
      targetDurationSeconds: null,
      // The cue goes with them, for the same reason: the save replaces the
      // block, so a note left out of the patch is a note cleared.
      note: null,
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

/**
 * The reason any of this exists: a treadmill was asked how many reps of
 * treadmill to do, and offered a working weight for it.
 */
describe('BuilderBlockRow — fields follow the measure', () => {
  it('asks a run for distance and time, and for nothing else', async () => {
    await render(
      <BuilderBlockRow
        block={block({
          name: 'Treadmill',
          measure: 'distance_duration',
          scheme: '5 km',
          targetDistanceKm: 5,
        })}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );
    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));

    expect(screen.getByTestId('builder-distance-blk-1')).toBeTruthy();
    expect(screen.getByTestId('builder-duration-blk-1')).toBeTruthy();
    expect(screen.queryByTestId('builder-reps-blk-1')).toBeNull();
    expect(screen.queryByTestId('builder-kg-blk-1')).toBeNull();
    // No sets either. Nobody prescribes three sets of a 5km.
    expect(screen.queryByTestId('builder-sets-blk-1')).toBeNull();
  });

  it('asks a hold for a time per set, in whatever form it is typed', async () => {
    const onChange = jest.fn();
    await render(
      <BuilderBlockRow
        block={block({ name: 'Plank', measure: 'duration', scheme: '3 × 45s' })}
        onChange={onChange}
        onRemove={() => {}}
      />,
    );
    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));

    await fireEvent.changeText(screen.getByTestId('builder-duration-blk-1'), '1:30');
    expect(onChange).toHaveBeenLastCalledWith(
      'blk-1',
      expect.objectContaining({ targetDurationSeconds: 90, scheme: '3 × 1:30' }),
    );
  });

  it('offers a bodyweight movement no weight to prescribe, and no clock', async () => {
    await render(
      <BuilderBlockRow
        block={block({ name: '3/4 Sit-up', measure: 'reps' })}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );
    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));

    expect(screen.getByTestId('builder-sets-blk-1')).toBeTruthy();
    expect(screen.getByTestId('builder-reps-blk-1')).toBeTruthy();
    expect(screen.queryByTestId('builder-kg-blk-1')).toBeNull();
    // A sit-up was being asked for a duration nobody had thought about.
    expect(screen.queryByTestId('builder-duration-blk-1')).toBeNull();
  });

  it('writes a run as distance and time rather than sets × reps', async () => {
    const onChange = jest.fn();
    await render(
      <BuilderBlockRow
        block={block({ name: 'Treadmill', measure: 'distance_duration', scheme: '1 km' })}
        onChange={onChange}
        onRemove={() => {}}
      />,
    );
    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));

    await fireEvent.changeText(screen.getByTestId('builder-distance-blk-1'), '5');
    await fireEvent.changeText(screen.getByTestId('builder-duration-blk-1'), '30:00');

    expect(onChange).toHaveBeenLastCalledWith('blk-1', {
      scheme: '5 km · 30:00',
      rpe: '',
      // Not "0 kg" and not the 62.5 somebody once typed: a run has no load to
      // prescribe, so none is sent.
      targetKg: null,
      targetDistanceKm: 5,
      targetDurationSeconds: 1800,
      note: null,
    });
  });

  it('leaves the weight off a run’s collapsed line', async () => {
    await render(
      <BuilderBlockRow
        block={block({
          name: 'Treadmill',
          measure: 'distance_duration',
          scheme: '5 km · 30:00',
          // Carried over from before it was known to be a run.
          targetKg: 20,
        })}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );

    expect(screen.getByText('5 km · 30:00')).toBeTruthy();
    expect(screen.queryByText('5 km · 30:00 · 20 kg')).toBeNull();
  });
});

/**
 * The gap the README called "cues exist on exercises but aren't sendable".
 *
 * `routine_blocks.note` has always been copied into
 * `workout_exercises.coach_note` when a workout starts, and the client has
 * always been shown it under the lift's name — but nothing anywhere let a
 * coach write one. The field was read and never written.
 */
describe('BuilderBlockRow — the coach’s cue', () => {
  it('sends what the coach typed', async () => {
    const onChange = jest.fn();
    await render(<BuilderBlockRow block={block()} onChange={onChange} onRemove={() => {}} />);
    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));

    await fireEvent.changeText(screen.getByTestId('builder-note-blk-1'), 'Chest up');

    expect(onChange).toHaveBeenLastCalledWith(
      'blk-1',
      expect.objectContaining({ note: 'Chest up' }),
    );
  });

  it('opens with the cue already on the block', async () => {
    await render(
      <BuilderBlockRow
        block={block({ note: 'Pause 1s on chest' })}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );
    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));

    expect(screen.getByTestId('builder-note-blk-1').props.value).toBe('Pause 1s on chest');
  });

  it('clears the cue rather than storing a blank one', async () => {
    const onChange = jest.fn();
    await render(
      <BuilderBlockRow block={block({ note: 'Chest up' })} onChange={onChange} onRemove={() => {}} />,
    );
    await fireEvent.press(screen.getByTestId('builder-edit-blk-1'));

    await fireEvent.changeText(screen.getByTestId('builder-note-blk-1'), '   ');

    expect(onChange).toHaveBeenLastCalledWith('blk-1', expect.objectContaining({ note: null }));
  });
});
