import { View } from 'react-native';

import { LISkeleton } from '@/components/ui';

const IDENTITY_ROWS = 3;

/** Mirrors the eyebrow and the one tall card: facts, choices, consent, buttons. */
export default function OptInSkeleton() {
  return (
    <View className="gap-5 px-4 pt-3">
      <LISkeleton className="h-3 w-40" />

      <View className="gap-4 rounded-card border border-violet-line bg-violet-weak/40 p-4">
        <View className="gap-2">
          <LISkeleton className="h-6 w-56" />
          <LISkeleton className="h-3 w-full" />
        </View>

        <View className="flex-row flex-wrap">
          {Array.from({ length: 4 }, (_, index) => (
            <View key={index} className="w-1/2 gap-1 py-2">
              <LISkeleton className="h-3 w-16" />
              <LISkeleton className="h-4 w-28" />
            </View>
          ))}
        </View>

        <View className="gap-2">
          <LISkeleton className="h-3 w-44" />
          <View className="gap-3 rounded-card bg-white p-4">
            {Array.from({ length: IDENTITY_ROWS }, (_, index) => (
              <View key={index} className="flex-row items-center gap-3">
                <LISkeleton className="h-5 w-5 rounded-pill" />
                <View className="flex-1 gap-1">
                  <LISkeleton className="h-4 w-28" />
                  <LISkeleton className="h-3 w-44" />
                </View>
                <LISkeleton className="h-3 w-16" />
              </View>
            ))}
          </View>
        </View>

        <LISkeleton className="h-12 w-full rounded-card" />
        <LISkeleton className="h-10 w-full" />
        <LISkeleton className="h-14 w-full rounded-2xl" />
      </View>
    </View>
  );
}
