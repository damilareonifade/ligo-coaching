import { useRouter } from 'expo-router';
import { MessagesSquare } from 'lucide-react-native';
import { useCallback, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { LIDialog, LIText } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

interface CommunityCreateSheetProps {
  readonly visible: boolean;
  readonly onClose: () => void;
}

interface ChoiceProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly body: string;
  readonly onPress: () => void;
  readonly testID: string;
}

function Choice({ icon, title, body, onPress, testID }: ChoiceProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      className="flex-row items-start gap-3 rounded-card bg-background p-4 active:opacity-80"
      testID={testID}
    >
      <View className="mt-0.5">{icon}</View>
      <View className="flex-1 gap-0.5">
        <LIText size="p" color="primary" text={title} className="font-geist-medium" />
        <LIText size="caption" color="muted" text={body} className="font-geist" />
      </View>
    </Pressable>
  );
}

/**
 * Making a group, from the tab where a coach already thinks about talking to
 * people.
 *
 * It used to offer a leaderboard as a second thing to create, beside a group.
 * That was wrong twice over: a ranking lives *inside* a group and has nowhere
 * else to be, and a group can rank several things at once — so "new
 * leaderboard" was neither a peer of "new group" nor a single choice. Rankings
 * are added from inside the group they belong to.
 *
 * The line says what it costs the client, not what it gives the coach.
 *
 * Drawn through `LIDialog` rather than `LIModal`, for the reason `LeaveSheet`
 * already gives in the same words: the bottom sheet measures its own content
 * to decide its height and can present at zero, which is how "Detach coach"
 * came to do nothing at all. This was the same nothing — the `+` opened a
 * sheet that was already there and nought pixels tall, with no error anywhere
 * to say so.
 */
export default function CommunityCreateSheet({ visible, onClose }: CommunityCreateSheetProps) {
  const tokens = useThemeTokens();
  const router = useRouter();

  const openGroup = useCallback(() => {
    onClose();
    router.push('/community/new-group');
  }, [onClose, router]);

  return (
    <LIDialog visible={visible} onClose={onClose} title="New group">
      <View className="gap-3">
        <Choice
          icon={<MessagesSquare color={tokens.violet} size={20} />}
          title="New group"
          body="One thread for several people. They see each other’s messages and nothing else. Rankings are added inside it."
          onPress={openGroup}
          testID="create-group"
        />
        <LIText
          size="caption"
          color="muted"
          text="You are sending invitations. Nobody is added to anything."
          className="px-1 font-geist"
        />
      </View>
    </LIDialog>
  );
}
