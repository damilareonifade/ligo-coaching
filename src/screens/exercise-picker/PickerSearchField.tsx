import { Search } from 'lucide-react-native';
import { useState } from 'react';

import { LIInput, LIText } from '@/components/ui';
import { resultCountLabel } from '@/lib/programs';
import { tokens } from '@/theme/tokens';

interface PickerSearchFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly resultCount: number;
}

/**
 * The count sits inside the field rather than under it: it is the answer to
 * what was just typed, and a coach narrowing a catalogue watches it move.
 */
export default function PickerSearchField({
  value,
  onChange,
  resultCount,
}: PickerSearchFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <LIInput
      value={value}
      onChangeText={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder="Search exercises, equipment or muscle"
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      accessibilityLabel="Search exercises"
      fieldClassName={focused ? 'border-violet' : undefined}
      leading={<Search color={tokens.muted} size={18} />}
      trailing={
        <LIText
          size="caption"
          color="muted"
          text={resultCountLabel(resultCount)}
          numberOfLines={1}
          className="font-geist"
        />
      }
      testID="picker-search"
    />
  );
}
