import { View } from 'react-native';

import type { ApiProgramDetail } from '@/api/types';
import { LICard, LIText } from '@/components/ui';

interface ProgramDetailHeaderProps {
  readonly program: ApiProgramDetail;
}

export default function ProgramDetailHeader({ program }: ProgramDetailHeaderProps) {
  // The draft state belongs next to who holds the program, not in a badge of
  // its own — "four clients, and they don't have this yet" is one sentence.
  const caption = program.hasDraftChanges
    ? `${program.assignedLabel} · draft changes`
    : program.assignedLabel;

  return (
    <LICard className="gap-1">
      <View className="flex-row items-baseline gap-1">
        <LIText
          size="h4"
          color="primary"
          text={program.name}
          numberOfLines={1}
          className="shrink font-geist-semibold"
        />
        <LIText
          size="p"
          color="muted"
          text={`· ${program.weeks} weeks`}
          className="font-geist"
        />
      </View>
      <LIText size="caption" color="muted" text={caption} className="font-geist" />
    </LICard>
  );
}
