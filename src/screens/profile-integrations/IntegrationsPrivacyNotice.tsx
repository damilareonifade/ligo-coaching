import { Lock } from 'lucide-react-native';
import { View } from 'react-native';

import { LIText } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

/** Said above the list, before anyone connects anything. */
export default function IntegrationsPrivacyNotice() {
  const tokens = useThemeTokens();
  return (
    <View className="flex-row items-start gap-3 rounded-card bg-surface-sunken p-4">
      <Lock color={tokens['foreground-subtle']} size={16} />
      <LIText
        size="caption"
        color="muted"
        text="Connections belong to your profile. A coach sees the data you shared with them, never your connected accounts or their credentials."
        className="flex-1 font-geist"
      />
    </View>
  );
}
