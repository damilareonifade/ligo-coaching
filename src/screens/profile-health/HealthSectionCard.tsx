import { View } from 'react-native';

import type { ApiHealthSection } from '@/api/types';
import { LIBadge, LICard, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * The label column is a fixed 108px (`w-[108px]` below) so values line up down
 * the whole card rather than stepping in and out with the label length.
 */
/** "Watch" is a caution, "Active" is a live constraint — different weights. */
function chipTone(chip: string): 'warning' | 'violet' {
  return chip === 'Watch' ? 'warning' : 'violet';
}

interface HealthSectionCardProps {
  readonly section: ApiHealthSection;
}

export default function HealthSectionCard({ section }: HealthSectionCardProps) {
  return (
    <View className="gap-2">
      <LIText
        size="caption"
        color="muted"
        text={section.title}
        className="px-1 font-geist-medium"
      />

      <LICard className="py-1">
        {section.rows.map((row, index) => (
          <View
            key={row.id}
            className={cn(
              'flex-row items-center gap-3 py-3',
              index > 0 && 'border-t border-hairline',
            )}
          >
            <LIText
              size="caption"
              color="muted"
              text={row.label}
              className="w-[108px] font-geist"
            />
            <LIText
              size="p"
              color="primary"
              text={row.value}
              className="flex-1 font-geist-medium"
            />
            {row.chip ? (
              <LIBadge
                tone={chipTone(row.chip)}
                label={row.chip}
                labelClassName="font-geist-medium"
              />
            ) : null}
          </View>
        ))}
      </LICard>

      <LIText size="caption" color="muted" text={section.note} className="px-1 font-geist" />
    </View>
  );
}
