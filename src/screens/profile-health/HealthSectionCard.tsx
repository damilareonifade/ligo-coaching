import { X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import type { ApiHealthSection } from '@/api/types';
import { LIBadge, LICard, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

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
  readonly onRemove: (entryId: string) => void;
  readonly removingId: string | null;
}

export default function HealthSectionCard({
  section,
  onRemove,
  removingId,
}: HealthSectionCardProps) {
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
            <Pressable
              onPress={() => onRemove(row.id)}
              disabled={removingId === row.id}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${row.label}`}
              className="p-1 active:opacity-60"
              testID={`health-remove-${row.id}`}
            >
              <X color={tokens.muted} size={16} />
            </Pressable>
          </View>
        ))}

        {section.rows.length === 0 ? (
          <View className="py-3">
            {/* Said, not left blank: "nothing recorded" is information a coach
                reading this profile needs, and empty space is not. */}
            <LIText
              size="p"
              color="muted"
              text="Nothing recorded."
              className="font-geist"
            />
          </View>
        ) : null}
      </LICard>

      <LIText size="caption" color="muted" text={section.note} className="px-1 font-geist" />
    </View>
  );
}
