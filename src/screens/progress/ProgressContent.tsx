import { useCallback } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { errorMessage } from '@/api/client';
import { useLogBodyWeightMutation } from '@/api/clientProgress';
import type { ApiClientProgress } from '@/api/types';
import { hasFeature } from '@/lib/features';
import { useUiStore } from '@/store/uiStore';
import { useThemeTokens } from '@/theme/tokens';

import ProgressBodyWeight from './ProgressBodyWeight';
import ProgressMonthly from './ProgressMonthly';
import ProgressPrivacyNote from './ProgressPrivacyNote';
import ProgressRecords from './ProgressRecords';
import ProgressVolumeCard from './ProgressVolumeCard';

interface ProgressContentProps {
  readonly progress: ApiClientProgress;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

export default function ProgressContent({
  progress,
  refreshing,
  onRefresh,
}: ProgressContentProps) {
  const tokens = useThemeTokens();
  const showToast = useUiStore((state) => state.showToast);
  const logWeight = useLogBodyWeightMutation();

  const handleLogWeight = useCallback(
    (weightKg: number) => {
      logWeight.mutate(
        { weightKg },
        {
          onSuccess: () => showToast('Weight logged', 'success'),
          onError: (error) => showToast(errorMessage(error), 'danger'),
        },
      );
    },
    [logWeight, showToast],
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-4 pb-8 pt-2"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
      }
    >
      <ProgressVolumeCard
        weeklyVolumeKg={progress.weeklyVolumeKg}
        changePct={progress.volumeChangePct}
        bars={progress.volumeBars}
      />
      <ProgressRecords records={progress.personalRecords} />
      <ProgressBodyWeight
        currentKg={progress.bodyWeightKg}
        series={progress.bodyWeightSeries}
        onLog={handleLogWeight}
        logging={logWeight.isPending}
      />
      {/* Its own feature and its own permission — and the card taps through
          to /check-ins, so showing it with the flag off would be a door to a
          screen that is not there. */}
      {hasFeature('checkIns') ? (
        <ProgressMonthly
          chip={progress.monthlyChip}
          entries={progress.monthly}
          note={progress.monthlyNote}
        />
      ) : null}
      <ProgressPrivacyNote />
    </ScrollView>
  );
}
