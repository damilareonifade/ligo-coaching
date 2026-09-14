import { useCallback } from 'react';
import { View } from 'react-native';

import { LICard, LISegmented, LIText } from '@/components/ui';
import { useSettingsStore, type ThemePreference } from '@/store/settingsStore';
import { useIsDark } from '@/theme/tokens';

const OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

/**
 * Light, dark, or whatever the phone is doing.
 *
 * "System" is the default and the honest one for most people — a phone that
 * darkens at sunset should take the app with it. The two overrides exist
 * because a gym at 6am and a living room at 10pm are not the same room, and
 * some people simply prefer one.
 *
 * Persisted and synced like the units, so a second device does not start back
 * on light.
 */
export default function ThemeContent() {
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const isDark = useIsDark();

  const choose = useCallback(
    (value: string) => setTheme(value as ThemePreference),
    [setTheme],
  );

  return (
    <View className="gap-4 px-4 pt-2">
      <LIText
        size="p"
        color="body"
        text="Applies everywhere in the app, and follows this account to your other devices."
        className="font-geist"
      />

      <LICard className="gap-3">
        <LISegmented
          options={OPTIONS.map((option) => ({ ...option }))}
          value={theme}
          onChange={choose}
          testID="theme-choice"
        />
        <LIText
          size="caption"
          color="muted"
          text={
            theme === 'system'
              ? `Following your phone, which is ${isDark ? 'dark' : 'light'} right now.`
              : `Always ${theme}, whatever your phone is set to.`
          }
          className="font-geist"
        />
      </LICard>

      {/* A worked example, so the choice can be seen before it is made rather
          than only after the whole app changes under you. */}
      <View className="gap-2">
        <LIText size="caption" color="muted" text="PREVIEW" className="px-1 font-geist-medium" />
        <LICard className="gap-3">
          <LIText size="h4" color="primary" text="Upper A · Push focus" className="font-geist-semibold" />
          <LIText
            size="caption"
            color="muted"
            text="5 exercises · last done 4 days ago"
            className="font-geist"
          />
          <View className="h-px bg-border" />
          <View className="flex-row items-center justify-between">
            <LIText size="p" color="body" text="Bench press" className="font-geist" />
            <LIText size="p" color="accent" text="4 × 6" className="font-geist-medium" />
          </View>
        </LICard>
      </View>
    </View>
  );
}
