import { Plus, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import type { ApiGroupBoard, BoardMetric } from '@/api/types';
import { LIBadge, LIButton, LICard, LIDialog, LIText } from '@/components/ui';
import { BOARD_METRIC_OPTIONS } from '@/lib/community';
import { useThemeTokens } from '@/theme/tokens';

interface ManageBoardsProps {
  readonly boards: readonly ApiGroupBoard[];
  readonly isAdmin: boolean;
  readonly onAdd: (metric: BoardMetric) => void;
  readonly onRemove: (boardId: string) => void;
  readonly onOpen: (boardId: string) => void;
  readonly busy?: boolean;
}

/**
 * What this group ranks.
 *
 * A ranking lives inside a group and has nowhere else to be, so this is the
 * only place one can be added — and until this screen existed, `add_group_board`
 * had no caller at all and a group could be made but never given one.
 *
 * A group may rank one thing or all nine. Each is its own ranking with its own
 * people on it, which is why the row says how many are on *that* one rather
 * than how many are in the group.
 */
export default function ManageBoards({
  boards,
  isAdmin,
  onAdd,
  onRemove,
  onOpen,
  busy = false,
}: ManageBoardsProps) {
  const tokens = useThemeTokens();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ApiGroupBoard | null>(null);

  const ranked = new Set(boards.map((board) => board.metric));
  const available = BOARD_METRIC_OPTIONS.filter((option) => !ranked.has(option.id));

  const add = useCallback(
    (metric: BoardMetric) => {
      setAdding(false);
      onAdd(metric);
    },
    [onAdd],
  );

  const confirmRemove = useCallback(() => {
    if (removing) onRemove(removing.id);
    setRemoving(null);
  }, [onRemove, removing]);

  return (
    <LICard className="gap-3">
      <View className="flex-row items-center gap-3">
        <LIText
          size="h5"
          color="primary"
          text="Leaderboards"
          className="flex-1 font-geist-semibold"
        />
        {isAdmin && available.length > 0 ? (
          <LIButton
            title=""
            onPress={() => setAdding(true)}
            variant="ghost"
            size="sm"
            loading={busy}
            icon={<Plus color={tokens.violet} size={18} />}
            accessibilityLabel="Add a leaderboard"
            className="h-9 w-9 gap-0 px-0"
            testID="manage-board-add"
          />
        ) : null}
      </View>

      {boards.length === 0 ? (
        <LIText
          size="caption"
          color="muted"
          text={
            isAdmin
              ? 'This group ranks nothing yet. Add one and each member decides for themselves whether to appear on it.'
              : 'This group ranks nothing yet.'
          }
          className="font-geist"
        />
      ) : (
        <View className="gap-2">
          {boards.map((board) => (
            <View key={board.id} className="flex-row items-center gap-3">
              <View
                className="min-w-0 flex-1 gap-0.5"
                accessibilityRole="button"
                accessibilityLabel={`Open the ${board.label} leaderboard`}
              >
                <LIText
                  size="p"
                  color="accent"
                  text={board.label}
                  numberOfLines={1}
                  handleClick={() => onOpen(board.id)}
                  className="font-geist-medium"
                  testID={`manage-board-${board.id}`}
                />
                {/* How many are on *this* ranking, not how many are in the
                    group: appearing is answered per ranking. */}
                <LIText
                  size="caption"
                  color="muted"
                  text={`${board.rankedCount} ranked`}
                  className="font-geist"
                />
              </View>

              {board.optedIn ? (
                <LIBadge tone="accent" label="You’re on it" labelClassName="font-geist-medium" />
              ) : null}

              {isAdmin ? (
                <LIButton
                  title=""
                  onPress={() => setRemoving(board)}
                  variant="ghost"
                  size="sm"
                  icon={<X color={tokens.danger} size={18} />}
                  accessibilityLabel={`Remove the ${board.label} leaderboard`}
                  className="h-9 w-9 gap-0 px-0"
                  testID={`manage-board-remove-${board.id}`}
                />
              ) : null}
            </View>
          ))}
        </View>
      )}

      <LIDialog
        visible={adding}
        onClose={() => setAdding(false)}
        title="Rank what?"
        testID="manage-board-picker"
      >
        <LIText
          size="p"
          color="body"
          text="Nobody appears on it until they say so, and each person answers for this ranking alone."
          className="font-geist"
        />
        <View className="gap-2">
          {available.map((option) => (
            <LIButton
              key={option.id}
              title={option.label}
              onPress={() => add(option.id)}
              variant="outline"
              size="lg"
              shape="rounded"
              fullWidth
              testID={`manage-board-pick-${option.id}`}
            />
          ))}
        </View>
      </LIDialog>

      <LIDialog
        visible={removing !== null}
        onClose={() => setRemoving(null)}
        title={removing ? `Remove ${removing.label}?` : 'Remove it?'}
        testID="manage-board-remove-dialog"
      >
        <LIText
          size="p"
          color="body"
          // What the cascade actually does, said plainly: consent does not
          // survive the thing it was given for.
          text="The ranking goes, and so does everybody's agreement to appear on it. Adding it again later asks all of them afresh."
          className="font-geist"
        />
        <View className="gap-2">
          <LIButton
            title="Remove it"
            onPress={confirmRemove}
            variant="danger"
            size="lg"
            shape="rounded"
            fullWidth
            testID="manage-board-remove-confirm"
          />
          <LIButton
            title="Keep it"
            onPress={() => setRemoving(null)}
            variant="ghost"
            size="lg"
            shape="rounded"
            fullWidth
          />
        </View>
      </LIDialog>
    </LICard>
  );
}
