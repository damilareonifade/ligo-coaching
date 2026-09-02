import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { LIButton } from '@/components/ui';

export default function DashboardFooter() {
  const router = useRouter();

  return (
    <View className="border-t border-gray px-4 py-3">
      <LIButton title="See full roster" onPress={() => router.push('/roster')} variant="outline" fullWidth />
    </View>
  );
}
