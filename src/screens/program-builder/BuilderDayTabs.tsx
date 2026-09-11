import { ScrollView } from 'react-native';

import { LIChip } from '@/components/ui';
import { useProgramDraftStore } from '@/store/programDraftStore';

/** Which day the block list below is editing. Horizontal — six days will not fit. */
export default function BuilderDayTabs() {
  const days = useProgramDraftStore((state) => state.days);
  const selectedDayId = useProgramDraftStore((state) => state.selectedDayId);
  const selectDay = useProgramDraftStore((state) => state.selectDay);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-2 pr-4"
    >
      {days.map((day) => (
        <LIChip
          key={day.id}
          label={day.label}
          selected={day.id === selectedDayId}
          onPress={() => selectDay(day.id)}
          testID={`builder-day-${day.id}`}
        />
      ))}
    </ScrollView>
  );
}
