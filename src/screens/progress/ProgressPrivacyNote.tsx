import { Info } from 'lucide-react-native';
import { View } from 'react-native';

import { LIText } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

/** Said on the screen it applies to, where it can still change a decision. */
export default function ProgressPrivacyNote() {
  const tokens = useThemeTokens();
  return (
    <View className="flex-row items-start gap-3 rounded-card border border-dashed border-border-strong p-4">
      <Info color={tokens['foreground-subtle']} size={16} />
      <LIText
        size="caption"
        color="muted"
        text="Your coach sees only what you shared. Progress photos are never shared automatically."
        className="flex-1 font-geist"
      />
    </View>
  );
}
