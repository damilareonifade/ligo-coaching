import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef, type ComponentRef, type ReactNode } from 'react';
import { View } from 'react-native';

import { LIText } from '@/components/ui';

export interface LIModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: ReactNode;
  /** Sheet heights, e.g. ['50%', '90%']. Defaults to content height. */
  readonly snapPoints?: readonly string[];
}

/**
 * Bottom sheet modal, driven declaratively so callers only own `visible`.
 * Requires `BottomSheetModalProvider` in the root layout.
 */
export function LIModal({ visible, onClose, title, children, snapPoints }: LIModalProps) {
  const sheetRef = useRef<ComponentRef<typeof BottomSheetModal>>(null);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints ? [...snapPoints] : undefined}
      enableDynamicSizing={!snapPoints}
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: '#F1EFE8' }}
    >
      <BottomSheetView>
        <View className="gap-4 px-4 pb-8 pt-2">
          {title ? <LIText size="h4" color="primary" text={title} /> : null}
          {children}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
