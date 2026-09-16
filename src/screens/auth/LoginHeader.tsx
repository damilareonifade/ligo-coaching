import { View } from 'react-native';

import { LIText } from '@/components/ui';

/** The centred welcome copy. */
export default function LoginHeader() {
  return (
    <View className="items-center gap-1 pt-4">
      <LIText size="h1" color="primary" text="Welcome back" className="text-center" />
      <LIText
        size="p"
        color="muted"
        text="Enter your credentials to sign in"
        className="text-center"
      />
    </View>
  );
}
