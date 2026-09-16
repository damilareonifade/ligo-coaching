import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import type { ApiDataAccessRow } from '@/api/types';
import { LIBadge, LIButton, LICard, LIText } from '@/components/ui';

interface DataAccessCardProps {
  readonly access: readonly ApiDataAccessRow[];
}

export default function DataAccessCard({ access }: DataAccessCardProps) {
  const router = useRouter();

  // Not `/onboarding/coach-permissions`: that reads the onboarding draft and
  // bounces anyone already attached back to "find a coach". Same broken target
  // the Permissions row on the profile had.
  const review = useCallback(() => router.push('/profile/permissions'), [router]);

  return (
    <LICard className="gap-3">
      <LIText
        size="caption"
        color="muted"
        text="Who can reach this data"
        className="font-geist-medium"
      />

      {access.map((row) => (
        <View key={row.id} className="flex-row items-center gap-3">
          <LIText
            size="p"
            color="primary"
            text={row.label}
            className="flex-1 font-geist-medium"
          />
          <LIBadge tone={row.tone} label={row.chip} labelClassName="font-geist-medium" />
        </View>
      ))}

      <LIButton
        title="Review coach permissions"
        variant="outline"
        fullWidth
        onPress={review}
        testID="data-review-permissions"
      />
    </LICard>
  );
}
