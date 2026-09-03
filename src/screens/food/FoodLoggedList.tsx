import { View } from 'react-native';

import type { ApiLoggedFood } from '@/api/types';
import { LIBadge, LICard, LIText } from '@/components/ui';

interface FoodLoggedListProps {
  readonly logged: readonly ApiLoggedFood[];
}

export default function FoodLoggedList({ logged }: FoodLoggedListProps) {
  return (
    <View className="gap-2">
      <LIText
        size="caption"
        color="muted"
        text="LOGGED TODAY"
        className="font-geist-medium uppercase tracking-wide"
      />

      {logged.length === 0 ? (
        <LICard>
          <LIText
            size="caption"
            color="muted"
            text="Nothing logged yet today."
            className="font-geist"
          />
        </LICard>
      ) : (
        <LICard className="gap-3">
          {logged.map((entry) => (
            <View key={entry.id} className="flex-row items-center gap-3">
              <View className="flex-1 gap-0.5">
                <LIText size="p" color="primary" text={entry.name} className="font-geist-medium" />
                <LIText size="caption" color="muted" text={entry.meta} className="font-geist" />
              </View>
              <LIText
                size="p"
                color="body"
                text={`${entry.kcal}`}
                className="font-geist-medium"
              />
              <LIBadge
                tone={entry.loggedBy === 'coach' ? 'violet' : 'neutral'}
                label={entry.loggedBy === 'coach' ? 'Coach' : 'You'}
                labelClassName="font-geist-medium"
              />
            </View>
          ))}
        </LICard>
      )}
    </View>
  );
}
