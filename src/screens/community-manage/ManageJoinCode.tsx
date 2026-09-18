import * as Clipboard from 'expo-clipboard';
import { Copy } from 'lucide-react-native';
import { useCallback } from 'react';
import { View } from 'react-native';

import { LIButton, LICard, LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';
import { useThemeTokens } from '@/theme/tokens';

interface ManageJoinCodeProps {
  readonly code: string;
}

/**
 * The door.
 *
 * Shown to every member and not only to admins: the code admits somebody to
 * the conversation, it does not promote them, and a group of training partners
 * has no reason to route every introduction through one person.
 *
 * It exists because there is nothing to pick from. A coach has a roster; a
 * client has nobody this app can list for them, and a box that looked somebody
 * up by their email would be an account checker.
 */
export default function ManageJoinCode({ code }: ManageJoinCodeProps) {
  const tokens = useThemeTokens();
  const showToast = useUiStore((state) => state.showToast);

  const copy = useCallback(() => {
    void Clipboard.setStringAsync(code);
    showToast('Code copied.', 'success');
  }, [code, showToast]);

  return (
    <LICard className="gap-3">
      <LIText size="h5" color="primary" text="Invite with a code" className="font-geist-semibold" />

      <View className="flex-row items-center gap-3">
        <LIText
          size="h3"
          color="accent"
          text={code}
          className="flex-1 font-geist-bold tracking-widest"
          testID="manage-join-code"
        />
        <LIButton
          title=""
          onPress={copy}
          variant="ghost"
          size="sm"
          icon={<Copy color={tokens.violet} size={18} />}
          accessibilityLabel="Copy the join code"
          className="h-9 w-9 gap-0 px-0"
          testID="manage-copy-code"
        />
      </View>

      <LIText
        size="caption"
        color="muted"
        text="Anyone with this code can join and choose how they appear. Sharing it lets somebody in; it does not give them anything to run."
        className="font-geist"
      />
    </LICard>
  );
}
