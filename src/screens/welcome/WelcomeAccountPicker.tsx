import { MoreVertical } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LIAvatar, LIButton, LIDialog, LIText } from '@/components/ui';
import type { LastAccount } from '@/store/lastAccountStore';
import { useThemeTokens } from '@/theme/tokens';

export interface WelcomeAccountPickerProps {
  readonly account: LastAccount | null;
  /** Sign in as the remembered account — the address is already known. */
  readonly onContinue: () => void;
  readonly onUseAnother: () => void;
  readonly onCreateAccount: () => void;
  readonly onForget: () => void;
}

const roleLabel = { client: 'Training', coach: 'Coaching' } as const;

/**
 * The foot of the welcome screen: who is about to sign in.
 *
 * Two shapes, not two components. With a remembered account the primary
 * action is *that person* and signing in as somebody else is the secondary
 * one; on a phone that has never been signed in, the same block is a plain
 * Sign in and Create an account. Written as one component because it is one
 * decision — which account — and splitting it would leave two files to keep
 * in step every time the wording below the buttons changes.
 */
export function WelcomeAccountPicker({
  account,
  onContinue,
  onUseAnother,
  onCreateAccount,
  onForget,
}: WelcomeAccountPickerProps) {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const [forgetOpen, setForgetOpen] = useState(false);

  const confirmForget = useCallback(() => {
    setForgetOpen(false);
    onForget();
  }, [onForget]);

  return (
    <View
      className="gap-3 bg-background px-6 pt-6"
      // The home indicator, plus the design's own breathing room under the
      // last row. `LISafeArea` is not doing this for us: the field above has
      // to run to the very edge of the screen, so the root takes no insets.
      style={{ paddingBottom: insets.bottom + 24 }}
      testID="welcome-account-picker"
    >
      {account ? (
        <>
          <LIText
            size="caption"
            text="Select an account to continue"
            color="muted"
            className="pb-1 text-center font-geist"
          />

          <Pressable
            onPress={onContinue}
            accessibilityRole="button"
            accessibilityLabel={`Continue as ${account.name}`}
            className="h-14 flex-row items-center gap-3 rounded-2xl bg-surface px-3.5 shadow-sm active:opacity-90"
            testID="welcome-continue-saved"
          >
            <LIAvatar name={account.name} uri={account.avatarUrl} size="sm" />
            <View className="min-w-0 flex-1">
              <LIText
                size="h5"
                color="primary"
                text={account.name}
                numberOfLines={1}
                className="font-geist-semibold"
              />
              <LIText
                size="caption"
                color="muted"
                text={`${roleLabel[account.role]} · ${account.email}`}
                numberOfLines={1}
                className="font-geist"
              />
            </View>
            {/* Its own button inside the row, so the menu is reachable without
                signing in as the person you are trying to remove. */}
            <Pressable
              onPress={() => setForgetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Options for ${account.name}`}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-xl active:bg-surface-sunken"
              testID="welcome-saved-menu"
            >
              <MoreVertical color={tokens['foreground-subtle']} size={18} />
            </Pressable>
          </Pressable>

          <LIButton
            title="Use another account"
            onPress={onUseAnother}
            variant="outline"
            size="lg"
            shape="rounded"
            fullWidth
            testID="welcome-use-another"
          />
        </>
      ) : (
        <LIButton
          title="Sign in"
          onPress={onUseAnother}
          size="lg"
          shape="rounded"
          fullWidth
          testID="welcome-sign-in"
        />
      )}

      <View className="flex-row items-center justify-center gap-1.5 pt-1.5">
        <LIText
          size="caption"
          color="muted"
          text="New to SetTrack?"
          className="font-geist"
        />
        <LIText
          size="caption"
          color="accent"
          text="Create an account"
          handleClick={onCreateAccount}
          className="font-geist-semibold underline"
          testID="welcome-create-account"
        />
      </View>

      <LIDialog
        visible={forgetOpen}
        onClose={() => setForgetOpen(false)}
        title="Forget this account?"
        testID="welcome-forget-dialog"
      >
        <LIText
          size="p"
          color="body"
          text={`${account?.email ?? 'This address'} stops being offered on this screen. It signs nobody out and deletes nothing — you can sign back in any time.`}
          className="font-geist"
        />
        <View className="gap-2">
          <LIButton
            title="Forget it"
            onPress={confirmForget}
            variant="danger"
            size="lg"
            shape="rounded"
            fullWidth
            testID="welcome-forget-confirm"
          />
          <LIButton
            title="Keep it"
            onPress={() => setForgetOpen(false)}
            variant="ghost"
            size="lg"
            shape="rounded"
            fullWidth
          />
        </View>
      </LIDialog>
    </View>
  );
}
