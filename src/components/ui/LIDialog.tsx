import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LIText } from './LIText';

export interface LIDialogProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: ReactNode;
  readonly testID?: string;
}

/**
 * A bottom-anchored dialog on React Native's own `Modal`.
 *
 * `LIModal` is the other one, built on `@gorhom/bottom-sheet`: draggable,
 * snap points, gesture-dismissed. This one is deliberately none of that,
 * because the sheet decides its own height by measuring its content, and when
 * that measures zero it presents at zero height — invisible, silent, no error.
 * A client reported "Detach coach does nothing" twice before that was found.
 *
 * So anything whose whole job is to be seen and answered — a confirmation,
 * a consequence list — belongs here. `Modal` is drawn by the platform and has
 * no measuring step to get wrong. Reach for `LIModal` when the sheet's
 * gestures are the point, not merely its shape.
 *
 * Dismissal is on the backdrop and on Android's back button (`onRequestClose`),
 * never on the card itself — a stray tap inside a dialog asking about
 * something irreversible should do nothing at all.
 */
export function LIDialog({ visible, onClose, title, children, testID }: LIDialogProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
        className="flex-1 justify-end bg-ink/40"
        testID="dialog-backdrop"
      >
        {/* Its own Pressable so a tap on the card is swallowed rather than
            bubbling to the backdrop and closing what it landed on. */}
        <Pressable
          onPress={() => {}}
          accessibilityViewIsModal
          className="rounded-t-card bg-white px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 24 }}
          testID={testID}
        >
          <View className="mb-4 h-1 w-10 self-center rounded-pill bg-hairline" />

          <View className="gap-4">
            {title ? (
              <LIText size="h4" color="primary" text={title} className="font-geist-semibold" />
            ) : null}
            {children}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
