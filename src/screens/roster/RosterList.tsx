import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import type { ApiStudent, StudentStatus } from '@/api/types';
import { LISelect } from '@/components';
import { LIEmptyState, LIList } from '@/components/ui';

import StudentRow from './StudentRow';

interface RosterListProps {
  readonly students: readonly ApiStudent[];
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}

type Filter = StudentStatus | 'all';

const filterOptions = [
  { label: 'Everyone', value: 'all' },
  { label: 'On track', value: 'on-track' },
  { label: 'At risk', value: 'at-risk' },
  { label: 'Inactive', value: 'inactive' },
] as const;

export default function RosterList({ students, refreshing, onRefresh }: RosterListProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(
    () => (filter === 'all' ? students : students.filter((student) => student.status === filter)),
    [filter, students],
  );

  const openStudent = useCallback(
    (studentId: string) => router.push(`/student/${studentId}`),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: ApiStudent }) => <StudentRow student={item} onPress={openStudent} />,
    [openStudent],
  );

  return (
    <LIList
      data={[...visible]}
      keyExtractor={(student) => student.id}
      renderItem={renderItem}
      contentContainerClassName="px-4 pb-8"
      ItemSeparatorComponent={() => <View className="h-3" />}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListHeaderComponent={
        <View className="pb-3">
          <LISelect
            value={filter}
            options={filterOptions}
            onChange={(next) => setFilter(next as Filter)}
            label="Show"
          />
        </View>
      }
      ListEmptyComponent={
        <LIEmptyState
          title="No students here"
          message="Nobody matches this filter yet. Try showing everyone."
          actionTitle="Show everyone"
          onAction={() => setFilter('all')}
        />
      }
    />
  );
}
