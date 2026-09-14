import { Lock } from 'lucide-react-native';
import { View } from 'react-native';

import { LIButton, LIText } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

interface HealthShareNoticeProps {
  readonly shared: boolean;
  readonly note: string;
  readonly onToggle: () => void;
  readonly pending: boolean;
}

/**
 * The switch sits with the sentence that explains it, at the top of the screen
 * — this is the control a client may need in a hurry, in front of the coach.
 */
export default function HealthShareNotice({
  shared,
  note,
  onToggle,
  pending,
}: HealthShareNoticeProps) {
  const tokens = useThemeTokens();
  return (
    <View className="gap-3 rounded-card bg-surface-sunken p-4">
      <View className="flex-row items-start gap-3">
        <Lock color={tokens['foreground-subtle']} size={16} />
        <LIText size="caption" color="muted" text={note} className="flex-1 font-geist" />
      </View>
      <LIButton
        size="sm"
        variant={shared ? 'outline' : 'violet'}
        title={shared ? 'Hide from Sam' : 'Share with Sam'}
        loading={pending}
        onPress={onToggle}
        className="self-end"
        testID="health-share-toggle"
      />
    </View>
  );
}
