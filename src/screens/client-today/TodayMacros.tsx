import { View } from 'react-native';

import type { ApiMacroTarget } from '@/api/types';
import { LICard, LIProgressBar, LIText } from '@/components/ui';

interface MacroCardProps {
  readonly label: string;
  readonly macro: ApiMacroTarget;
}

function MacroCard({ label, macro }: MacroCardProps) {
  // A zero target would divide by zero and paint a full bar — read it as empty.
  const ratio = macro.target > 0 ? macro.consumed / macro.target : 0;

  return (
    <LICard className="flex-1 gap-2">
      <LIText size="caption" color="muted" text={label} className="font-geist" />

      <View className="flex-row items-baseline gap-1">
        <LIText
          size="h3"
          color="primary"
          text={macro.consumed.toLocaleString('en-US')}
          className="font-geist-semibold"
        />
        <LIText
          size="caption"
          color="muted"
          text={`/ ${macro.target.toLocaleString('en-US')} ${macro.unit}`}
          className="font-geist-medium"
        />
      </View>

      <LIProgressBar value={ratio} label={`${label} progress`} />
    </LICard>
  );
}

interface TodayMacrosProps {
  readonly calories: ApiMacroTarget;
  readonly protein: ApiMacroTarget;
}

export default function TodayMacros({ calories, protein }: TodayMacrosProps) {
  return (
    <View className="flex-row gap-3">
      <MacroCard label="Calories" macro={calories} />
      <MacroCard label="Protein" macro={protein} />
    </View>
  );
}
