import { Plus } from 'lucide-react-native';

import { LIButton } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

interface CommunityNewButtonProps {
  readonly onNew: () => void;
}

/**
 * Start a group, from either screen that lists them.
 *
 * A screen-level action that sits in the header rather than in the list under
 * it: neither an inbox nor a list of groups has a natural place for "start
 * something new" that is not on top of somebody's conversation.
 */
export default function CommunityNewButton({ onNew }: CommunityNewButtonProps) {
  const tokens = useThemeTokens();
  return (
    <LIButton
      title=""
      accessibilityLabel="Start a group"
      onPress={onNew}
      icon={<Plus color={tokens.inverse} size={20} />}
      className="h-10 w-10 gap-0 px-0"
      testID="messages-new"
    />
  );
}
