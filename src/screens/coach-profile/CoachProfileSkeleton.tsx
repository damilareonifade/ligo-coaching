import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors CoachProfileForm: intro line, three fields, a chip row, the button. */
export default function CoachProfileSkeleton() {
  return (
    <View className="flex-1 gap-6 px-4 pb-8 pt-2">
      <LISkeleton className="h-4 w-64" />

      <View className="gap-4">
        {[0, 1].map((index) => (
          <View key={index} className="gap-2">
            <LISkeleton className="h-3 w-28" />
            <LISkeleton className="h-12 w-full rounded-2xl" />
          </View>
        ))}
        <View className="gap-2">
          <LISkeleton className="h-3 w-20" />
          <LISkeleton className="h-24 w-full rounded-2xl" />
        </View>
      </View>

      <View className="gap-2">
        <LISkeleton className="h-4 w-24" />
        <View className="flex-row flex-wrap gap-2">
          {['w-20', 'w-28', 'w-24', 'w-16'].map((width) => (
            <LISkeleton key={width} className={`h-9 rounded-full ${width}`} />
          ))}
        </View>
      </View>

      <View className="mt-auto">
        <LISkeleton className="h-14 w-full rounded-2xl" />
      </View>
    </View>
  );
}
