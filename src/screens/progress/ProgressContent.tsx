import { RefreshControl, ScrollView } from 'react-native';

import type { ApiClientProgress } from '@/api/types';
import { tokens } from '@/theme/tokens';

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
      />
      <ProgressMonthly
        chip={progress.monthlyChip}
        entries={progress.monthly}
        note={progress.monthlyNote}
      />
      <ProgressPrivacyNote />
    </ScrollView>
  );
}
