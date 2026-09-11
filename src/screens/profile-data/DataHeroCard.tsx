import { View } from 'react-native';

import type { ApiDataCount } from '@/api/types';
import { LIText } from '@/components/ui';

/** Fixed three-up grid, so the tiles line up however many counts arrive. */
const COLUMNS = 3;

function chunk(counts: readonly ApiDataCount[]): readonly (readonly ApiDataCount[])[] {
  const rows: ApiDataCount[][] = [];
  for (let index = 0; index < counts.length; index += COLUMNS) {
    rows.push(counts.slice(index, index + COLUMNS));
  }
  return rows;
}

interface DataHeroCardProps {
  readonly counts: readonly ApiDataCount[];
}

export default function DataHeroCard({ counts }: DataHeroCardProps) {
  const rows = chunk(counts);

  return (
    <View className="gap-3 rounded-card bg-violet-weak p-4">
      <View className="gap-1">
        <LIText
          size="h4"
          color="primary"
          text="Everything in your profile"
          className="font-geist-semibold"
        />
        <LIText
          size="caption"
          color="muted"
          text="Exportable in full, at any time, whether or not a coach is attached."
          className="font-geist"
        />
      </View>

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row gap-2">
          {row.map((count) => (
            <View
              key={count.label}
              className="flex-1 items-center gap-0.5 rounded-2xl bg-white p-3"
            >
              <LIText
                size="h5"
                color="primary"
                text={count.value}
                className="font-geist-semibold"
              />
              <LIText
                size="caption"
                color="muted"
                text={count.label}
                className="font-geist"
                numberOfLines={1}
              />
            </View>
          ))}
          {/* Keeps a short last row the same tile width as a full one. */}
          {Array.from({ length: COLUMNS - row.length }, (_, filler) => (
            <View key={`filler-${filler}`} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}
