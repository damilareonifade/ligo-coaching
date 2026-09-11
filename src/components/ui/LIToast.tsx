import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/utils';
import { useUiStore, type ToastTone } from '@/store/uiStore';

const toneClass: Record<ToastTone, string> = {
  success: 'bg-success',
  danger: 'bg-danger',
  info: 'bg-violet',
};

/** Mounted once in the root layout. Read toasts with `useUiStore`. */
export function LIToastHost() {
  const toasts = useUiStore((state) => state.toasts);
  const dismissToast = useUiStore((state) => state.dismissToast);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      className="absolute left-0 right-0 z-50 gap-2 px-4"
      style={{ top: insets.top + 8 }}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <Animated.View key={toast.id} entering={FadeInDown} exiting={FadeOutUp}>
          <Pressable
            onPress={() => dismissToast(toast.id)}
            accessibilityRole="alert"
            className={cn('rounded-2xl px-4 py-3', toneClass[toast.tone])}
          >
            <Text className="text-p font-semibold text-white">{toast.message}</Text>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}
