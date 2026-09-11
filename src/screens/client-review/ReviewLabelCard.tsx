import { ScrollView, View } from 'react-native';

import type { ApiRosterLabel } from '@/api/types';
import { LICard, LIChip, LILabelDot, LIText } from '@/components/ui';
import { currentLabelName, labelPrivacyNote } from '@/lib/clientReview';

interface ReviewLabelCardProps {
  readonly name: string;
  readonly labels: readonly ApiRosterLabel[];
  readonly labelId: string | null;
  readonly onSelect: (labelId: string | null) => void;
}

/**
 * The coach's own filing, and the one card on this screen that is about the
 * coach rather than the client.
 *
 * Which is exactly why the sentence underneath is not optional. Every other
 * card here answers "what am I allowed to see", and a coach moving between
 * them could reasonably read a label picker as another lever on the
 * relationship. It is not one, so the card says so in the client's own name
 * before the coach has to wonder.
 *
 * Tapping the selected chip clears it. Unfiling someone should not require
 * hunting for a "None" option that would sit in the row pretending to be a
 * label.
 */
export default function ReviewLabelCard({
  name,
  labels,
  labelId,
  onSelect,
}: ReviewLabelCardProps) {
  return (
    <LICard className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <LIText size="h5" color="primary" text="Label" className="font-geist-semibold" />
        <LIText
          size="caption"
          color="muted"
          text={currentLabelName(labelId, labels)}
          className="font-geist"
          numberOfLines={1}
        />
      </View>

      {labels.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pr-1"
        >
          {labels.map((label) => (
            <LIChip
              key={label.id}
              label={label.name}
              selected={label.id === labelId}
              leading={<LILabelDot color={label.color} />}
              onPress={() => onSelect(label.id === labelId ? null : label.id)}
              testID={`review-label-${label.id}`}
            />
          ))}
        </ScrollView>
      ) : (
        <LIText
          size="caption"
          color="muted"
          text="No labels yet. Create them from your roster."
          className="font-geist"
        />
      )}

      <LIText
        size="caption"
        color="muted"
        text={labelPrivacyNote(name)}
        className="font-geist"
        testID="review-label-note"
      />
    </LICard>
  );
}
