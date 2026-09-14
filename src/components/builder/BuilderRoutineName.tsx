import { useCallback, useState } from 'react';

import { LIInput } from '@/components/ui';

interface BuilderDayNameProps {
  readonly label: string;
  /** Used when the box is left empty — a routine must reach the client named. */
  readonly fallback: string;
  readonly onRename: (label: string) => void;
}

/**
 * What a routine is called. Program → Routines → Exercises: "Routine 2" is
 * where the name starts, not where it has to stay. A coach thinking in
 * Upper A / Lower B says so here, and that is what the client is handed.
 *
 * Committed on blur rather than per keystroke: this reaches a saved program on
 * the edit screen, where every write is a round trip.
 */
export default function BuilderRoutineName({ label, fallback, onRename }: BuilderDayNameProps) {
  const [text, setText] = useState(label);

  const commit = useCallback(() => {
    const trimmed = text.trim();
    const next = trimmed.length > 0 ? trimmed : fallback;
    setText(next);
    if (next !== label) onRename(next);
  }, [text, fallback, label, onRename]);

  return (
    <LIInput
      label="Routine name"
      value={text}
      onChangeText={setText}
      onBlur={commit}
      onSubmitEditing={commit}
      placeholder="Upper A"
      autoCapitalize="words"
      returnKeyType="done"
      accessibilityLabel="Routine name"
      testID="builder-day-name"
    />
  );
}
