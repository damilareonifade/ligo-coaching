import { useCallback } from 'react';
import { View } from 'react-native';

import { useProgramsQuery } from '@/api/programs';
import { LIErrorState, LISafeArea, LIText } from '@/components/ui';
import ProgramList from '@/screens/programs/ProgramList';
import ProgramSkeleton from '@/screens/programs/ProgramSkeleton';

export { LIRouteError as ErrorBoundary } from '@/components/ui';

export default function ProgramsScreen() {
  const { data, isPending, error, refetch, isRefetching } = useProgramsQuery();

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <LISafeArea>
        <ProgramSkeleton />
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

  return (
    <LISafeArea>
      <View className="px-4 pt-2">
        <LIText size="h2" color="primary" text="Programs" />
      </View>
      <View className="flex-1">
        <ProgramList programs={data ?? []} refreshing={isRefetching} onRefresh={refresh} />
      </View>
    </LISafeArea>
  );
}
