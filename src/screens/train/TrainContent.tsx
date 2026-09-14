import { RefreshControl, ScrollView } from 'react-native';

import type { ApiClientSession, ApiTrainOverview } from '@/api/types';
import { tokens } from '@/theme/tokens';

import TrainResumeBanner from './TrainResumeBanner';
import TrainRoutines from './TrainRoutines';

interface TrainContentProps {
  readonly overview: ApiTrainOverview;
  readonly activeSession: ApiClientSession | null;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
  readonly onStart: (routineId: string) => void;
  readonly onDelete: (routineId: string) => void;
  readonly onDeleteAll: () => void;
  readonly onDecideUpdate: (routineId: string, accept: boolean) => void;
  readonly decidingId: string | null;
  readonly pendingPlanId: string | null;
  readonly busy: boolean;
}

export default function TrainContent({
  overview,
  activeSession,
  refreshing,
  onRefresh,
  onStart,
  onDelete,
  onDeleteAll,
  onDecideUpdate,
  decidingId,
  pendingPlanId,
  busy,
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
      <TrainRoutines
        routines={overview.routines}
        week={overview.week}
        onStart={onStart}
        onDelete={onDelete}
        onDeleteAll={onDeleteAll}
        onDecideUpdate={onDecideUpdate}
        decidingId={decidingId}
        startingId={pendingPlanId}
        disabled={busy}
      />
    </ScrollView>
  );
}
