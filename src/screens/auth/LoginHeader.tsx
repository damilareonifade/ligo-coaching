import { View } from 'react-native';

import { LIBrandMark, LIText } from '@/components/ui';

/** Brand mark, then the centred welcome copy. */
export default function LoginHeader() {
  return (
    <View className="gap-10 pt-4">
      <LIBrandMark />

      <View className="items-center gap-1">
        <LIText size="h1" color="primary" text="Welcome back" className="text-center" />
        <LIText
          size="p"
          color="muted"
          text="Enter your credentials to sign in"
          className="text-center"
        />
      </View>
    </View>
  );
}
