import { View } from 'react-native';

import { LIButton, LIText } from '@/components/ui';
import { leaveBoardNote, notOptedInNotice, ordinal } from '@/lib/community';

interface BoardActionsProps {
  readonly coachName: string;
  readonly invitedNotOptedIn: number;
  /** `null` when the reader has no row — then there is no placement to share. */
  readonly myRank: number | null;
  readonly onShare: () => void;
  readonly onLeave: () => void;
}

/**
 * Everything under the ranking: who is absent, what can be taken outside, and
 * how to stop being on it.
 *
 * The absent count comes first, before the two buttons, because it is the line
 * that stops the board being read as "everyone I train with". Six rows looks
 * like the whole roster until it says otherwise.
 */
export default function BoardActions({
  coachName,
  invitedNotOptedIn,
  myRank,
  onShare,
  onLeave,
}: BoardActionsProps) {
  return (
    <View className="gap-4 pt-4">
      {invitedNotOptedIn > 0 ? (
        <LIText
          size="caption"
          color="muted"
          text={notOptedInNotice(invitedNotOptedIn)}
          className="px-1 font-geist"
          testID="board-not-opted-in"
        />
      ) : null}

      <View className="gap-2">
        {myRank !== null ? (
          <LIButton
            title={`Share my ${ordinal(myRank)} place`}
            variant="outline"
            fullWidth
            shape="rounded"
            onPress={onShare}
            testID="board-share"
          />
        ) : null}

        <LIButton
          title="Leave this leaderboard"
          variant="outline"
          fullWidth
          shape="rounded"
          className="border-danger"
          labelClassName="text-danger"
          onPress={onLeave}
          testID="board-leave"
        />
      </View>

      <LIText
        size="caption"
        color="muted"
        text={leaveBoardNote(coachName)}
        className="px-1 font-geist"
      />
    </View>
  );
}
