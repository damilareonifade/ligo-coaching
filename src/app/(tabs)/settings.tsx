import { View } from 'react-native';

import { useCoachQuery } from '@/api/coach';
import { LISafeArea, LIText } from '@/components/ui';
import SettingsContent from '@/screens/settings/SettingsContent';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function SettingsScreen() {
  const { data } = useCoachQuery();

  return (
    <LISafeArea>
      <View className="px-4 pt-2">
        <LIText size="h2" color="primary" text="Settings" />
      </View>
      <SettingsContent coach={data ?? null} />
    </LISafeArea>
  );
}
