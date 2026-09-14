import { Eye } from 'lucide-react-native';
import { View } from 'react-native';

import { LIText } from '@/components/ui';
import { groupVisibilityNotice } from '@/lib/community';
import { useThemeTokens } from '@/theme/tokens';

interface GroupVisibilityNoticeProps {
  readonly memberCount: number;
}

/**
 * Sits above the thread, not behind an info button.
 *
 * A group chat is the place in this app where it is easiest to forget how many
 * people are reading, and easiest to assume the group can see more of you than
 * it can. The notice answers both at once, permanently, in the room where the
 * typing happens — and it names the count rather than saying "everyone",
 * because "everyone" is the word people underestimate.
 */
export default function GroupVisibilityNotice({ memberCount }: GroupVisibilityNoticeProps) {
  const tokens = useThemeTokens();
  return (
    <View className="flex-row items-start gap-2.5 rounded-card border border-violet-line bg-violet-weak/40 p-3">
      <View className="mt-0.5">
        <Eye color={tokens.violet} size={16} />
      </View>
      <LIText
        size="caption"
        color="body"
        text={groupVisibilityNotice(memberCount)}
        className="flex-1 font-geist"
      />
    </View>
  );
}
