import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { LIButton, LISafeArea, LIText } from '@/components/ui';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <LISafeArea edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <LIText size="h2" color="primary" text="Nothing here" className="text-center" />
        <LIText
          size="p"
          color="muted"
          text="That screen does not exist — it may have moved."
          className="text-center"
        />
        <LIButton title="Back to today" onPress={() => router.replace('/')} variant="outline" />
      </View>
    </LISafeArea>
  );
}
