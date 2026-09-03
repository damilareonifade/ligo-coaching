import { View } from 'react-native';

import { LIButton, LIText } from '@/components/ui';

interface SessionFinishButtonProps {
  readonly onFinish: () => void;
  readonly finishing: boolean;
}

export default function SessionFinishButton({ onFinish, finishing }: SessionFinishButtonProps) {
  return (
    <View className="gap-2">
      <LIButton
        title="Finish workout"
        variant="outline"
        onPress={onFinish}
        loading={finishing}
        fullWidth
        testID="session-finish"
      />
      <LIText
        size="caption"
        color="muted"
        text="Nothing is shared until you finish."
        className="text-center font-geist"
      />
    </View>
  );
}
