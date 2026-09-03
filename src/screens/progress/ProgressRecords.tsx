import { Trophy } from 'lucide-react-native';
import { View } from 'react-native';

import type { ApiPersonalRecord } from '@/api/types';
import { LICard, LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

interface ProgressRecordsProps {
  readonly records: readonly ApiPersonalRecord[];
}

export default function ProgressRecords({ records }: ProgressRecordsProps) {
  return (
    <LICard className="gap-3">
      <LIText size="h5" color="primary" text="Personal records" className="font-geist-semibold" />

      {records.length === 0 ? (
        <LIText
          size="caption"
          color="muted"
          text="Your first PR lands here the moment you beat a set."
          className="font-geist"
        />
      ) : (
        records.map((record) => (
          <View key={record.id} className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-2xl bg-violet-weak">
              <Trophy color={tokens.violet} size={16} />
            </View>
            <View className="flex-1 gap-0.5">
              <LIText size="p" color="primary" text={record.name} className="font-geist-medium" />
              <LIText size="caption" color="muted" text={record.value} className="font-geist" />
            </View>
            <LIText size="caption" color="muted" text={record.when} className="font-geist" />
          </View>
        ))
      )}
    </LICard>
  );
}
