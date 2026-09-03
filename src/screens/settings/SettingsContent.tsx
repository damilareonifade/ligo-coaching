import { useCallback } from 'react';
import { ScrollView, Switch, View } from 'react-native';

import type { ApiCoach } from '@/api/types';
import { LISelect } from '@/components/LISelect';
import { LIButton, LICard, LIDivider, LIText } from '@/components/ui';
import type { WeightUnit } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { tokens } from '@/theme/tokens';

interface SettingsContentProps {
  readonly coach: ApiCoach | null;
}

export default function SettingsContent({ coach }: SettingsContentProps) {
  const unit = useSettingsStore((state) => state.unit);
  const setUnit = useSettingsStore((state) => state.setUnit);
  const reminders = useSettingsStore((state) => state.sessionReminders);
  const setReminders = useSettingsStore((state) => state.setSessionReminders);
  const signOut = useAuthStore((state) => state.signOut);

  const handleSignOut = useCallback(() => {
    void signOut();
  }, [signOut]);

  return (
    <ScrollView contentContainerClassName="gap-3 px-4 pb-10 pt-2">
      <LICard className="gap-1">
        <LIText size="h4" color="primary" text={coach?.name ?? 'Coach'} />
        <LIText size="caption" color="muted" text={coach?.gymName ?? 'No gym set'} />
        <LIText size="caption" color="muted" text={coach?.email ?? ''} />
      </LICard>

      <LICard className="gap-4 bg-white">
        <LISelect
          label="Weight unit"
          value={unit}
          options={[
            { label: 'Kilograms (kg)', value: 'kg' },
            { label: 'Pounds (lb)', value: 'lb' },
          ]}
          onChange={(next) => setUnit(next as WeightUnit)}
        />

        <LIDivider />

        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <LIText size="p" color="body" text="Session reminders" />
            <LIText size="caption" color="muted" text="Notify me 30 minutes before a session." />
          </View>
          <Switch
            value={reminders}
            onValueChange={setReminders}
            trackColor={{ true: tokens.violet, false: tokens.field }}
            thumbColor={tokens.white}
          />
        </View>
      </LICard>

      <LIButton title="Sign out" onPress={handleSignOut} variant="outline" fullWidth />
    </ScrollView>
  );
}
