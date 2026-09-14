import { Lock } from 'lucide-react-native';
import { View } from 'react-native';

import { LIText } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

interface LiveNoticeProps {
  readonly notice: string;
}

/**
 * Says what this screen is before the coach has scrolled far enough to
 * discover it by trying.
 *
 * A read-only screen that looks exactly like the editable one is a trap: the
 * client's session screen has tappable weights and a tick per set, and this
 * has the same anatomy with none of the affordances. Rather than let a coach
 * find that out by pressing a set that does not respond, the limit is stated
 * once, at the top, with a lock next to it.
 */
export default function LiveNotice({ notice }: LiveNoticeProps) {
  const tokens = useThemeTokens();
  return (
    <View
      className="flex-row items-start gap-3 rounded-card bg-surface-sunken px-4 py-3"
      testID="live-notice"
    >
      <View className="mt-0.5">
        <Lock color={tokens['foreground-subtle']} size={16} />
      </View>
      <LIText size="caption" color="muted" text={notice} className="flex-1 font-geist" />
    </View>
  );
}
