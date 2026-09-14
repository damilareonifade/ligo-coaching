import { Lock } from 'lucide-react-native';
import { View } from 'react-native';

import { LIButton, LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

interface ChatArchivedNoticeProps {
  /** Worded by the caller — detaching reads differently from each seat. */
  readonly message: string;
  /** Optional way forward. The coach's side has none: only the client re-attaches. */
  readonly actionTitle?: string;
  readonly onAction?: () => void;
  readonly actionTestID?: string;
}

/**
 * Detaching closes the thread without deleting it. The dashed border says the
 * same thing the copy does: this is a record now, not a place to type. It sits
 * exactly where the composer was, so the absence is visible rather than felt.
 */
export default function ChatArchivedNotice({
  message,
  actionTitle,
  onAction,
  actionTestID,
}: ChatArchivedNoticeProps) {
  return (
    <View className="gap-3 border-t border-hairline bg-canvas px-4 py-3">
      <View className="flex-row items-start gap-3 rounded-card border border-dashed border-hairline-strong p-4">
        <Lock color={tokens.muted} size={16} />
        <LIText size="caption" color="muted" text={message} className="flex-1 font-geist" />
      </View>

      {actionTitle && onAction ? (
        <LIButton
          title={actionTitle}
          variant="outline"
          fullWidth
          onPress={onAction}
          testID={actionTestID}
        />
      ) : null}
    </View>
  );
}
