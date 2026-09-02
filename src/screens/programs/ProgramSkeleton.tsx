import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

export default function ProgramSkeleton() {
  return (
    <View className="gap-3 px-4 pt-2">
      {[0, 1, 2].map((row) => (
        <View key={row} className="gap-2 rounded-card bg-sky p-4">
          <LISkeleton className="h-4 w-40" />
          <LISkeleton className="h-3 w-52" />
          <LISkeleton className="h-3 w-32" />
        </View>
      ))}
    </View>
  );
}
