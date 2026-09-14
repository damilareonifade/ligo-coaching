import { useRouter } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { useCallback } from 'react';
import { View } from 'react-native';

import type { ApiMonthlyMini } from '@/api/types';
import { LIBadge, LICard, LIText } from '@/components/ui';
import { useThemeTokens } from '@/theme/tokens';

/** A drop reads as progress here; "—" is the first month, with nothing to compare. */
function deltaColor(delta: string): 'success' | 'muted' {
  return delta.startsWith('−') ? 'success' : 'muted';
}

interface ProgressMonthlyProps {
  readonly chip: string;
  readonly entries: readonly ApiMonthlyMini[];
  readonly note: string;
}

export default function ProgressMonthly({ chip, entries, note }: ProgressMonthlyProps) {
  const tokens = useThemeTokens();
  const router = useRouter();
  // The card is a summary of the full record — three rows of it, then the door.
  const openCheckIns = useCallback(() => router.push('/check-ins'), [router]);

  return (
    <LICard className="gap-3" onPress={openCheckIns} testID="progress-monthly">
      <View className="flex-row items-center gap-2">
        <CalendarDays color={tokens.violet} size={18} />
        <LIText
          size="h5"
          color="primary"
          text="Monthly check-ins"
          className="flex-1 font-geist-semibold"
        />
        <LIBadge tone="violet" label={chip} labelClassName="font-geist-medium" />
      </View>

      {entries.map((entry) => (
        <View key={entry.id} className="flex-row items-center gap-3">
          <LIText
            size="caption"
            color="body"
            text={entry.label}
            className="flex-1 font-geist-medium"
          />
          <LIText size="caption" color="muted" text={entry.weight} className="font-geist" />
          <LIText
            size="caption"
            color={deltaColor(entry.delta)}
            text={entry.delta}
            className="w-10 text-right font-geist-medium"
          />
          <LIBadge
            tone={entry.by === 'coach' ? 'violet' : 'neutral'}
            label={entry.by === 'coach' ? 'Coach' : 'You'}
            labelClassName="font-geist-medium"
          />
        </View>
      ))}

      <LIText size="caption" color="muted" text={note} className="font-geist" />
    </LICard>
  );
}
