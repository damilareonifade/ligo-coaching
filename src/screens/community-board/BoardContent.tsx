import { useRouter } from 'expo-router';
import { EyeOff, History, UserCheck } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useLeaveBoardMutation } from '@/api/community';
import type { ApiBoardRow, ApiCommunityBoard } from '@/api/types';
import { LIButton, LIList, LIText } from '@/components/ui';
import { BOARD_SHARE_NOTE, ordinal } from '@/lib/community';
import LeaveSheet, { type LeaveConsequence } from '@/components/community/LeaveSheet';
import { useUiStore } from '@/store/uiStore';
import { useThemeTokens } from '@/theme/tokens';

import BoardActions from './BoardActions';
import BoardHeaderCard from './BoardHeaderCard';
import BoardRankRow from './BoardRankRow';

interface BoardContentProps {
  readonly board: ApiCommunityBoard;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

interface RankListRow {
  readonly row: ApiBoardRow;
  readonly first: boolean;
  readonly last: boolean;
}

/**
 * The ranking, and the two ways off it.
 *
 * `LIList` rather than a mapped ScrollView: a board is the one community
 * screen with no natural ceiling — a gym-wide challenge is a long list of
 * people, and the header and footer travel as list components so it recycles
 * properly at any length.
 */
export default function BoardContent({ board, refreshing, onRefresh }: BoardContentProps) {
  const tokens = useThemeTokens();
  const router = useRouter();
  const showToast = useUiStore((state) => state.showToast);
  const leave = useLeaveBoardMutation();

  const [leaving, setLeaving] = useState(false);

  const mine = board.rows.find((row) => row.isMe) ?? null;

  const rows = useMemo<readonly RankListRow[]>(
    () =>
      board.rows.map((row, index) => ({
        row,
        first: index === 0,
        last: index === board.rows.length - 1,
      })),
    [board.rows],
  );

  const renderItem = useCallback(
    ({ item }: { item: RankListRow }) => (
      <BoardRankRow row={item.row} first={item.first} last={item.last} />
    ),
    [],
  );

  // Stubbed: no share sheet is wired up. The toast says so rather than
  // pretending, and repeats the rule that would still apply if it were —
  // being ranked in here is not consent to be posted out there.
  const handleShare = useCallback(() => {
    showToast(`Sharing is not wired up yet. ${BOARD_SHARE_NOTE}`, 'info');
  }, [showToast]);

  const confirmLeave = useCallback(() => {
    leave.mutate(board.id, {
      onSuccess: () => {
        setLeaving(false);
        router.replace('/community');
      },
      onError: (error: unknown) => {
        setLeaving(false);
        showToast(errorMessage(error), 'danger');
      },
    });
  }, [board.id, leave, router, showToast]);

  const consequences: readonly LeaveConsequence[] = [
    {
      id: 'ranking',
      icon: <EyeOff color={tokens.danger} size={18} />,
      title: 'You disappear from the ranking',
      body: 'Immediately, for everyone.',
    },
    {
      id: 'history',
      icon: <History color={tokens['foreground-subtle']} size={18} />,
      title: 'Your history is untouched',
      body: 'Sessions, volume and PRs stay yours.',
    },
    {
      id: 'coach',
      icon: <UserCheck color={tokens['foreground-subtle']} size={18} />,
      title: `${board.coachName} stays your coach`,
      body: 'Leaving a board changes nothing about coaching.',
    },
  ];

  const openOptIn = useCallback(
    () => router.push(`/community/board/${board.id}/opt-in`),
    [board.id, router],
  );

  return (
    <View className="flex-1">
      <LIList
        data={[...rows]}
        keyExtractor={(item) => `${item.row.rank}-${item.row.displayName}`}
        renderItem={renderItem}
        contentContainerClassName="px-4 pb-10 pt-2"
        ListHeaderComponent={
          <View className="pb-3">
            <BoardHeaderCard
              name={board.name}
              metricLabel={board.metricLabel}
              optedIn={board.optedIn}
              stats={board.stats}
            />
          </View>
        }
        // Not opted in means there is genuinely nothing to look at: the other
        // rows are not hidden from this reader, they are simply not this
        // reader's business until they have put a row of their own up.
        ListEmptyComponent={
          <View className="gap-3 rounded-card bg-surface p-6">
            <LIText
              size="h4"
              color="primary"
              text="You are not on this board"
              className="font-geist-semibold"
            />
            <LIText
              size="p"
              color="muted"
              text="Nothing of yours is ranked here, and nobody on it can see you. Joining asks you how you want to appear first."
              className="font-geist"
            />
            <LIButton
              title="Join leaderboard"
              variant="outline"
              fullWidth
              shape="rounded"
              onPress={openOptIn}
              testID="board-join"
            />
          </View>
        }
        ListFooterComponent={
          board.optedIn ? (
            <BoardActions
              coachName={board.coachName}
              invitedNotOptedIn={board.invitedNotOptedIn}
              myRank={mine ? mine.rank : null}
              onShare={handleShare}
              onLeave={() => setLeaving(true)}
            />
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
        }
        testID="board-list"
      />

      <LeaveSheet
        visible={leaving}
        onClose={() => setLeaving(false)}
        title={`Leave ${board.name}?`}
        body={
          mine
            ? `You are ${ordinal(mine.rank)} right now. Leaving takes the row down; it does not undo the training behind it.`
            : 'Leaving takes your row down. It does not undo the training behind it.'
        }
        consequences={consequences}
        confirmTitle="Leave leaderboard"
        onConfirm={confirmLeave}
        loading={leave.isPending}
        testID="board-leave-sheet"
      />
    </View>
  );
}
