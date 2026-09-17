import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useMotion } from '@/theme/motion';

import { LIButton } from './LIButton';
import { LIText } from './LIText';

export interface LIEmptyStateProps {
  readonly title: string;
  readonly message: string;
  readonly actionTitle?: string;
  readonly onAction?: () => void;
}

/** Components own their empty state — loading and error belong to the screen. */
export function LIEmptyState({ title, message, actionTitle, onAction }: LIEmptyStateProps) {
  const motion = useMotion();
  return (
    // Faded in rather than cut in. This is one of the two things that appear
    // where content was expected, and arriving instantly makes an empty list
    // read as a failure to load rather than as an answer.
    //
    // The wrapper animates and the `View` inside carries the classes:
    // NativeWind does not resolve `className` on anything Reanimated wraps.
    <Animated.View entering={motion.enter}>
      <View className="items-center gap-2 px-6 py-10">
        <LIText size="h4" color="primary" text={title} className="text-center" />
        <LIText size="p" color="muted" text={message} className="text-center" />
        {actionTitle && onAction ? (
          <LIButton
            title={actionTitle}
            onPress={onAction}
            variant="outline"
            size="sm"
            className="mt-2"
          />
        ) : null}
      </View>
    </Animated.View>
  );
}
