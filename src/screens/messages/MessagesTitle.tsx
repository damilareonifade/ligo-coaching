import { Plus } from 'lucide-react-native';
import { View } from 'react-native';

import { LIButton, LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

interface MessagesTitleProps {
  /** Opens the create sheet. Omitted while the inbox is still loading. */
  readonly onNew?: () => void;
}

/** Fixed above the list, so the inbox scrolls under its own name. */
export default function MessagesTitle({ onNew }: MessagesTitleProps) {
  return (
    <View className="flex-row items-center gap-3 px-4 pb-1 pt-2">
      <LIText
        size="h2"
        color="primary"
        text="Messages"
        className="flex-1 font-geist-bold"
      />

      {onNew ? (
        <LIButton
          title=""
          accessibilityLabel="Start a group or leaderboard"
          onPress={onNew}
          icon={<Plus color={tokens.white} size={20} />}
          className="h-10 w-10 gap-0 px-0"
          testID="messages-new"
        />
      ) : null}
    </View>
  );
}
