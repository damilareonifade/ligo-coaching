import type { ReactNode } from 'react';
import { View } from 'react-native';

import { LIModal } from '@/components/LIModal';
import { LIButton, LIText } from '@/components/ui';

export interface LeaveConsequence {
  readonly id: string;
  readonly icon: ReactNode;
  readonly title: string;
  readonly body: string;
}

interface LeaveSheetProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly body: string;
  /** What actually happens, one row per consequence. */
  readonly consequences: readonly LeaveConsequence[];
  readonly confirmTitle: string;
  readonly onConfirm: () => void;
  readonly loading?: boolean;
  readonly testID?: string;
}

/**
 * The confirmation for leaving a group or a board, shared by both so the two
 * cannot end up promising different things.
 *
 * It lists consequences rather than asking "are you sure?". Someone leaving a
 * leaderboard is usually worried about something specific — that their history
 * goes with it, or that their coach will take it personally — and the honest
 * answer to both is on this sheet, above the button, where it can still change
 * the decision. A dialog that only escalates the tone answers neither.
 */
export default function LeaveSheet({
  visible,
  onClose,
  title,
  body,
  consequences,
  confirmTitle,
  onConfirm,
  loading = false,
  testID,
}: LeaveSheetProps) {
  return (
    <LIModal visible={visible} onClose={onClose} title={title}>
      <View className="gap-4" testID={testID}>
        <LIText size="p" color="body" text={body} className="font-geist" />

        <View className="gap-3 rounded-card bg-canvas p-4">
          {consequences.map((consequence) => (
            <View key={consequence.id} className="flex-row items-start gap-3">
              <View className="mt-0.5">{consequence.icon}</View>
              <View className="flex-1 gap-0.5">
                <LIText
                  size="p"
                  color="primary"
                  text={consequence.title}
                  className="font-geist-medium"
                />
                <LIText
                  size="caption"
                  color="muted"
                  text={consequence.body}
                  className="font-geist"
                />
              </View>
            </View>
          ))}
        </View>

        <View className="gap-2">
          <LIButton
            title={confirmTitle}
            variant="danger"
            fullWidth
            shape="rounded"
            loading={loading}
            onPress={onConfirm}
            testID="leave-confirm"
          />
          <LIButton
            title="Stay"
            variant="ghost"
            fullWidth
            shape="rounded"
            onPress={onClose}
            testID="leave-dismiss"
          />
        </View>
      </View>
    </LIModal>
  );
}
