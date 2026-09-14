import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { ApiSessionExercise } from '@/api/types';
import { LIInput, LIText } from '@/components/ui';
import { exerciseNoteLines } from '@/lib/session';

interface SessionExerciseNoteProps {
  readonly exercise: ApiSessionExercise;
  readonly onSaveNote: (exerciseId: string, note: string | null) => void;
}

/**
 * The note lines under an exercise name, and the client's own one made
 * editable in place.
 *
 * Only `ownNote` is writable: a coach's cue is an instruction, not a field on
 * the client's form, so tapping never lands in it. Inline rather than a sheet
 * — the lift it belongs to has to stay on screen while it is written.
 */
export default function SessionExerciseNote({
  exercise,
  onSaveNote,
}: SessionExerciseNoteProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(exercise.ownNote ?? '');

  const open = useCallback(() => {
    setText(exercise.ownNote ?? '');
    setEditing(true);
  }, [exercise.ownNote]);

  const save = useCallback(() => {
    const trimmed = text.trim();
    setEditing(false);
    // An emptied box clears the note rather than saving a blank one.
    onSaveNote(exercise.id, trimmed.length > 0 ? trimmed : null);
  }, [text, exercise.id, onSaveNote]);

  if (editing) {
    return (
      <LIInput
        value={text}
        onChangeText={setText}
        onBlur={save}
        onSubmitEditing={save}
        autoFocus
        placeholder="Your note on this lift"
        returnKeyType="done"
        accessibilityLabel={`Your note on ${exercise.name}`}
        variant="filled"
        containerClassName="pt-1"
        testID={`exercise-note-input-${exercise.id}`}
      />
    );
  }

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={
        exercise.ownNote
          ? `Edit your note on ${exercise.name}`
          : `Add a note on ${exercise.name}`
      }
      hitSlop={6}
      className="self-start active:opacity-70"
      testID={`exercise-note-${exercise.id}`}
    >
      <View className="gap-0.5">
        {exerciseNoteLines(exercise).map((line) => (
          <LIText key={line} size="caption" color="muted" text={line} className="font-geist" />
        ))}
      </View>
    </Pressable>
  );
}
