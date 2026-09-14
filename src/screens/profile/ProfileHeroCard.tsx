import { ChevronRight } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, View } from 'react-native';

import type { ApiProfileStat } from '@/api/types';
import { LIAvatar, LIText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';
import { useThemeTokens } from '@/theme/tokens';

interface ProfileHeroCardProps {
  readonly name: string;
  readonly email: string;
  readonly memberSince: string;
  readonly stats: readonly ApiProfileStat[];
}

/** Who you are and what you have done — the only tinted card on the screen. */
export default function ProfileHeroCard({
  name,
  email,
  memberSince,
  stats,
}: ProfileHeroCardProps) {
  const tokens = useThemeTokens();
  const showToast = useUiStore((state) => state.showToast);
  const stub = useCallback(() => showToast('Not connected yet', 'success'), [showToast]);

  return (
    <View className="gap-3 rounded-card bg-violet-weak p-4">
      <Pressable
        onPress={stub}
        accessibilityRole="button"
        accessibilityLabel={`${name}. ${email}`}
        className="flex-row items-center gap-3 active:opacity-80"
        testID="profile-hero-row"
      >
        <LIAvatar name={name} size="lg" className="bg-surface" labelClassName="font-geist-semibold" />
        <View className="flex-1 gap-0.5">
          <LIText size="h4" color="primary" text={name} className="font-geist-semibold" />
          <LIText
            size="caption"
            color="muted"
            text={`${email} · ${memberSince}`}
            className="font-geist"
            numberOfLines={1}
          />
        </View>
        <ChevronRight color={tokens['foreground-subtle']} size={20} />
      </Pressable>

      <View className="flex-row gap-2">
        {stats.map((stat) => (
          <View key={stat.label} className="flex-1 items-center gap-0.5 rounded-2xl bg-surface p-3">
            <LIText size="h4" color="primary" text={stat.value} className="font-geist-semibold" />
            <LIText
              size="caption"
              color="muted"
              text={stat.label}
              className="font-geist"
              numberOfLines={1}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
