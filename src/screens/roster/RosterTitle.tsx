import { View } from 'react-native';

import { LIText } from '@/components/ui';

/** Fixed above the list, so the roster scrolls under its own name. */
export default function RosterTitle() {
  return (
    <View className="px-4 pb-1 pt-2">
      <LIText size="h2" color="primary" text="Roster" className="font-geist-bold" />
    </View>
  );
}
