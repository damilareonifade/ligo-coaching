import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/utils';
import { useMotion } from '@/theme/motion';
import { useUiStore, type ToastTone } from '@/store/uiStore';

import { LIPressable } from './LIPressable';

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
  const motion = useMotion();

  if (toasts.length === 0) return null;

  return (
    <View
      className="absolute left-0 right-0 z-50 gap-2 px-4"
      style={{ top: insets.top + 8 }}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        // Durations from the shared vocabulary rather than Reanimated's
        // defaults, which are twice as long as anything else in this app and
        // made a toast feel like it was being reluctant.
        <Animated.View key={toast.id} entering={motion.enterDown} exiting={motion.exitUp}>
          <LIPressable
            onPress={() => dismissToast(toast.id)}
            accessibilityRole="alert"
            className={cn('rounded-2xl px-4 py-3', toneClass[toast.tone])}
          >
            <Text className="text-p font-semibold text-surface">{toast.message}</Text>
          </LIPressable>
        </Animated.View>
      ))}
    </View>
  );
}
