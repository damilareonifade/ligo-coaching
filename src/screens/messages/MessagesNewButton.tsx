import { Plus } from 'lucide-react-native';

import { LIButton } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

interface MessagesNewButtonProps {
  readonly onNew: () => void;
}

/**
 * Start a group or a leaderboard.
 *
 * The one screen-level action in the app that sits in the header rather than
 * in the list under it: an inbox has no natural place for "start something
 * new" that is not on top of a conversation.
 */
export default function MessagesNewButton({ onNew }: MessagesNewButtonProps) {
  const tokens = useThemeTokens();
  return (
    <LIButton
      title=""
      accessibilityLabel="Start a group or leaderboard"
      onPress={onNew}
      icon={<Plus color={tokens.inverse} size={20} />}
      className="h-10 w-10 gap-0 px-0"
      testID="messages-new"
    />
  );
}
