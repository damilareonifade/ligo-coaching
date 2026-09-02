import { useCallback } from 'react';
import { View } from 'react-native';

import { useStudentsQuery } from '@/api/students';
import { LIErrorState, LISafeArea, LIText } from '@/components/ui';
import RosterList from '@/screens/roster/RosterList';
import RosterSkeleton from '@/screens/roster/RosterSkeleton';
import RosterStats from '@/screens/roster/RosterStats';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function RosterScreen() {
  const { data, isPending, error, refetch, isRefetching } = useStudentsQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <RosterSkeleton />
      </LISafeArea>
    );
  }

  if (error) {
    return (
      <LISafeArea>
        <LIErrorState message={error.message} onRetry={refresh} />
      </LISafeArea>
    );
  }

  const students = data ?? [];

  return (
    <LISafeArea>
      <View className="px-4 pb-2 pt-2">
        <LIText size="h2" color="primary" text="Roster" />
      </View>
      <RosterStats students={students} />
      <View className="flex-1">
        <RosterList students={students} refreshing={isRefetching} onRefresh={refresh} />
      </View>
    </LISafeArea>
  );
}
