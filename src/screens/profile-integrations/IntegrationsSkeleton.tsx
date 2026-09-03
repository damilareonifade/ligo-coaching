import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

/** Mirrors IntegrationsPrivacyNotice plus five IntegrationCards. */
export default function IntegrationsSkeleton() {
  return (
    <View className="gap-4 px-4 pt-2">
      <View className="flex-row items-start gap-3 rounded-card bg-field p-4">
        <LISkeleton className="h-4 w-4 rounded-pill" />
        <LISkeleton className="h-10 flex-1" />
      </View>

      {[0, 1, 2, 3, 4].map((card) => (
        <View key={card} className="gap-3 rounded-card bg-white p-4">
          <View className="flex-row items-center gap-3">
            <LISkeleton className="h-11 w-11 rounded-2xl" />
            <View className="flex-1 gap-2">
              <LISkeleton className="h-4 w-28" />
              <LISkeleton className="h-3 w-40" />
            </View>
            <LISkeleton className="h-6 w-24 rounded-pill" />
          </View>
          <View className="flex-row items-center gap-2 border-t border-hairline pt-3">
            <LISkeleton className="h-6 w-14 rounded-pill" />
            <LISkeleton className="h-6 w-14 rounded-pill" />
            <View className="flex-1" />
            <LISkeleton className="h-9 w-24 rounded-pill" />
          </View>
        </View>
      ))}
    </View>
  );
}
