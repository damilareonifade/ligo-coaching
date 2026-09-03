import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import type { BoardWindow } from '@/api/types';
import { LIChipGroup, LIInput, LIText } from '@/components/ui';
import { BOARD_WINDOW_OPTIONS } from '@/lib/community';

interface BoardWindowPickerProps {
  readonly value: BoardWindow;
  readonly onChange: (window: BoardWindow) => void;
  readonly from: string;
  readonly to: string;
  readonly onFromChange: (value: string) => void;
  readonly onToChange: (value: string) => void;
}

/**
 * The window the metric is measured over. The two date fields exist only under
 * `Custom` — the three named windows already answer the question, and a pair
 * of empty date boxes sitting above them invites a coach to fill in something
 * the board does not need.
 */
export default function BoardWindowPicker({
  value,
  onChange,
  from,
  to,
  onFromChange,
  onToChange,
}: BoardWindowPickerProps) {
  return (
    <View className="gap-2">
      <LIChipGroup
        label="Time window"
        options={BOARD_WINDOW_OPTIONS.map((option) => ({
          label: option.label,
          value: option.id,
        }))}
        value={value}
        onChange={(next) => onChange(next as BoardWindow)}
        testID="board-window"
      />

      {value === 'custom' ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} className="flex-row gap-3 pt-1">
          <LIInput
            containerClassName="flex-1"
            label="From"
            placeholder="1 Dec"
            value={from}
            onChangeText={onFromChange}
            maxLength={16}
            testID="board-window-from"
          />
          <LIInput
            containerClassName="flex-1"
            label="To"
            placeholder="31 Dec"
            value={to}
            onChangeText={onToChange}
            maxLength={16}
            testID="board-window-to"
          />
        </Animated.View>
      ) : null}

      <LIText
        size="caption"
        color="muted"
        text="The window is shown on every invite, so nobody joins without knowing what is being counted."
        className="px-1 font-geist"
      />
    </View>
  );
}
