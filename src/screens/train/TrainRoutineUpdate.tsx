import { View } from 'react-native';

import type { ApiRoutineUpdate } from '@/api/types';
import { LIButton, LIText } from '@/components/ui';

interface TrainRoutineUpdateProps {
  readonly routineId: string;
  readonly update: ApiRoutineUpdate;
  readonly diverged: boolean;
  readonly onDecide: (routineId: string, accept: boolean) => void;
  readonly deciding: boolean;
}

/**
 * The second gate, on the card it belongs to.
 *
 * A coach's published change arrives here as a proposal and nothing else — the
 * routine above is untouched until the client answers. It sits inside the card
 * rather than as a separate inbox because the decision is about *this* routine
 * and is unanswerable without seeing it.
 */
export default function TrainRoutineUpdate({
  routineId,
  update,
  diverged,
  onDecide,
  deciding,
}: TrainRoutineUpdateProps) {
  return (
    <View
      className="gap-2 rounded-card border border-violet-line bg-violet-weak p-3"
      testID={`routine-update-${routineId}`}
    >
      <LIText
        size="caption"
        color="accent"
        text="Your coach updated this"
        className="font-geist-semibold"
      />
      <LIText size="caption" color="body" text={update.summary} className="font-geist" />

      {/* Only worth saying when there is something of theirs to lose. */}
      {diverged ? (
        <LIText
          size="caption"
          color="muted"
          text="Taking it replaces the changes you made to this routine."
          className="font-geist"
        />
      ) : null}

      <View className="flex-row gap-2 pt-1">
        <LIButton
          title="Keep mine"
          onPress={() => onDecide(routineId, false)}
          variant="outline"
          disabled={deciding}
          className="flex-1"
          testID={`routine-update-decline-${routineId}`}
        />
        <LIButton
          title="Take update"
          onPress={() => onDecide(routineId, true)}
          loading={deciding}
          className="flex-1"
          testID={`routine-update-accept-${routineId}`}
        />
      </View>
    </View>
  );
}
