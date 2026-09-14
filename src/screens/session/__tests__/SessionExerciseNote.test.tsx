import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ApiSessionExercise } from '@/api/types';
import SessionExerciseNote from '@/screens/session/SessionExerciseNote';

function exercise(overrides: Partial<ApiSessionExercise> = {}): ApiSessionExercise {
  return {
    id: 'cex-bench',
    name: 'Bench press',
    coachNote: null,
    ownNote: null,
    sets: [],
    ...overrides,
  };
}

describe('SessionExerciseNote', () => {
  it('writes a note where there was none', async () => {
    const onSaveNote = jest.fn();
    await render(<SessionExerciseNote exercise={exercise()} onSaveNote={onSaveNote} />);

    expect(screen.getByText('No note')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('exercise-note-cex-bench'));
    await fireEvent.changeText(
      screen.getByTestId('exercise-note-input-cex-bench'),
      'elbows tucked',
    );
    await fireEvent(screen.getByTestId('exercise-note-input-cex-bench'), 'submitEditing');

    expect(onSaveNote).toHaveBeenCalledWith('cex-bench', 'elbows tucked');
  });

  it('clears the note when the box is emptied', async () => {
    const onSaveNote = jest.fn();
    await render(
      <SessionExerciseNote exercise={exercise({ ownNote: 'elbows tucked' })} onSaveNote={onSaveNote} />,
    );

    await fireEvent.press(screen.getByTestId('exercise-note-cex-bench'));
    await fireEvent.changeText(screen.getByTestId('exercise-note-input-cex-bench'), '  ');
    await fireEvent(screen.getByTestId('exercise-note-input-cex-bench'), 'submitEditing');

    expect(onSaveNote).toHaveBeenCalledWith('cex-bench', null);
  });

  /**
   * The permission boundary, at the only place it is visible: a coach's cue is
   * an instruction, so editing seeds the client's own note and never that one.
   */
  it('never edits into the coach’s cue', async () => {
    const onSaveNote = jest.fn();
    await render(
      <SessionExerciseNote
        exercise={exercise({ coachNote: 'pause 1s on chest' })}
        onSaveNote={onSaveNote}
      />,
    );

    expect(screen.getByText('Coach note: pause 1s on chest')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('exercise-note-cex-bench'));
    expect(screen.getByTestId('exercise-note-input-cex-bench').props.value).toBe('');

    await fireEvent.changeText(screen.getByTestId('exercise-note-input-cex-bench'), 'mine');
    await fireEvent(screen.getByTestId('exercise-note-input-cex-bench'), 'submitEditing');

    expect(onSaveNote).toHaveBeenCalledWith('cex-bench', 'mine');
  });

  it('shows both notes when both exist', async () => {
    await render(
      <SessionExerciseNote
        exercise={exercise({ coachNote: 'pause 1s on chest', ownNote: 'elbows tucked' })}
        onSaveNote={() => {}}
      />,
    );

    expect(screen.getByText('Coach note: pause 1s on chest')).toBeTruthy();
    expect(screen.getByText('Your note: elbows tucked')).toBeTruthy();
  });
});
