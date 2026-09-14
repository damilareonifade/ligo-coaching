import { View } from 'react-native';

import { LIText } from '@/components/ui';

interface NotificationsEmptyStateProps {
  readonly isCoach: boolean;
}

/**
 * An empty feed is not a failure — it is a quiet week. It says what will land
 * here, because "nothing here" is exactly when someone wonders whether the
 * other side has gone quiet or the app has.
 */
export default function NotificationsEmptyState({ isCoach }: NotificationsEmptyStateProps) {
  return (
    <View className="mt-2 items-center gap-2 rounded-card border border-dashed border-border-strong px-6 py-10">
      <LIText
        size="p"
        color="primary"
        text="Nothing has happened yet."
        className="text-center font-geist-medium"
      />
      <LIText
        size="caption"
        color="muted"
        text={
          isCoach
            ? 'Sessions, check-ins, replies and permission changes all land here as your clients make them.'
            : 'Routines your coach assigns, replies to your check-ins and anything they ask to see will land here.'
        }
        className="text-center font-geist"
      />
    </View>
  );
}
