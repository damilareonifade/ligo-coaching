import { View } from 'react-native';

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
  return (
    <View className="items-center gap-2 px-6 py-10">
      <LIText size="h4" color="primary" text={title} className="text-center" />
      <LIText size="p" color="muted" text={message} className="text-center" />
      {actionTitle && onAction ? (
        <LIButton title={actionTitle} onPress={onAction} variant="outline" size="sm" className="mt-2" />
      ) : null}
    </View>
  );
}
