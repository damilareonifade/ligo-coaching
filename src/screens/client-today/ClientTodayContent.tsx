import { useCallback } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { useClientTodayQuery } from '@/api/clientTraining';
import { LIErrorState } from '@/components/ui';
import { useStartWorkout } from '@/hooks/useStartWorkout';
import { tokens } from '@/theme/tokens';

import ClientTodaySkeleton from './ClientTodaySkeleton';
import TodayCoachCard from './TodayCoachCard';
import TodayMacros from './TodayMacros';
import TodayPlanCard from './TodayPlanCard';
import TodayWeek from './TodayWeek';

/**
 * The client half of the Today tab. Every fetch for the screen happens here,
 * once; the sections below take data as props.
 */
export default function ClientTodayContent() {
  const { data, isPending, error, refetch, isRefetching } = useClientTodayQuery();
  const { start, isPending: starting } = useStartWorkout();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) return <ClientTodaySkeleton />;
  if (error || !data) return <LIErrorState message={error?.message} onRetry={refresh} />;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-4 pb-8 pt-2"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refresh}
          tintColor={tokens.violet}
        />
      }
    >
      <TodayPlanCard plan={data.plan} onStart={start} starting={starting} />
      <TodayMacros calories={data.calories} protein={data.protein} />
      <TodayCoachCard coach={data.coach} />
      <TodayWeek week={data.week} />
    </ScrollView>
  );
}
