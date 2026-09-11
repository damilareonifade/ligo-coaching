import { RefreshControl, ScrollView } from 'react-native';

import type { ApiClientSession, ApiTrainOverview } from '@/api/types';
import { tokens } from '@/theme/tokens';

import TrainNextUpCard from './TrainNextUpCard';
import TrainProgramCard from './TrainProgramCard';
import TrainQuickActions from './TrainQuickActions';
import TrainResumeBanner from './TrainResumeBanner';
import TrainRoutines from './TrainRoutines';

interface TrainContentProps {
  readonly overview: ApiTrainOverview;
  readonly activeSession: ApiClientSession | null;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
  readonly onStart: (planId: string) => void;
  readonly starting: boolean;
}

export default function TrainContent({
  overview,
  activeSession,
  refreshing,
  onRefresh,
  onStart,
  starting,
}: TrainContentProps) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-4 pb-8 pt-2"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.violet} />
      }
    >
      <TrainResumeBanner session={activeSession} />
      <TrainNextUpCard
        plan={overview.nextUp}
        preview={overview.nextUpPreview}
        onStart={onStart}
        starting={starting}
      />
      <TrainQuickActions />
      <TrainRoutines routines={overview.routines} />
      {overview.program ? <TrainProgramCard program={overview.program} /> : null}
    </ScrollView>
  );
}
