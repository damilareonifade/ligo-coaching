import { View } from 'react-native';

import { LIButton } from './LIButton';
import { LIText } from './LIText';

export interface LIErrorStateProps {
  readonly message?: string;
  readonly onRetry?: () => void;
}

export function LIErrorState({
  message = 'We could not load this. Check your connection and try again.',
  onRetry,
}: LIErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-6">
      <LIText size="h4" color="primary" text="Something went wrong" className="text-center" />
      <LIText size="p" color="muted" text={message} className="text-center" />
      {onRetry ? <LIButton title="Try again" onPress={onRetry} variant="outline" size="sm" /> : null}
    </View>
  );
}
