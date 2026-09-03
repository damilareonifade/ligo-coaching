import { View } from 'react-native';

import { LIText } from '@/components/ui';

/** Fixed above the list, so the inbox scrolls under its own name. */
export default function MessagesTitle() {
  return (
    <View className="px-4 pb-1 pt-2">
      <LIText size="h2" color="primary" text="Messages" className="font-geist-bold" />
    </View>
  );
}
