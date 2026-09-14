import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { View } from 'react-native';

import type { ApiProgramSummary } from '@/api/types';
import { LIAvatar, LIBadge, LICard, LIText } from '@/components/ui';
import { statusTone } from '@/lib/programs';
import { useThemeTokens } from '@/theme/tokens';

interface ProgramCardProps {
  readonly program: ApiProgramSummary;
  /** Resolved from the roster by the screen — the coach's real clients. */
  readonly assignedNames: readonly string[];
}

/** Three faces, then a count. Past that the stack stops being readable. */
const VISIBLE_AVATARS = 3;

function ProgramCardBase({ program, assignedNames }: ProgramCardProps) {
  const tokens = useThemeTokens();
  const router = useRouter();

  const open = useCallback(
    () => router.push(`/programs/${program.id}`),
    [router, program.id],
  );

  const shown = assignedNames.slice(0, VISIBLE_AVATARS);
  const overflow = assignedNames.length - shown.length;

  return (
    <LICard onPress={open} className="gap-3" testID={`program-card-${program.id}`}>
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-0.5">
          <LIText
            size="h5"
            color="primary"
            text={program.name}
            numberOfLines={1}
            className="font-geist-semibold"
          />
          <LIText
            size="caption"
            color="muted"
            text={program.meta}
            numberOfLines={1}
            className="font-geist"
          />
        </View>
        <LIBadge
          tone={statusTone(program.status)}
          label={program.statusLabel}
          labelClassName="font-geist-medium"
        />
      </View>

      <View className="h-px bg-border" />

      <View className="flex-row items-center gap-3">
        {shown.length > 0 ? (
          <View className="flex-row">
            {shown.map((name, index) => (
              <LIAvatar
                key={name}
                name={name}
                size="sm"
                // Overlapped and ringed in the card's own white so the stack
                // reads as one group rather than three separate circles. The
                // overlap stops at 8px: a 36px avatar centres two initials
                // across its middle 18px, and -ml-3 clipped the second glyph
                // (PB read as PE, AH as AI).
                className={index === 0 ? 'border-2 border-surface' : '-ml-2 border-2 border-surface'}
                labelClassName="text-caption"
              />
            ))}
            {overflow > 0 ? (
              <View className="-ml-2 h-9 items-center justify-center rounded-pill border-2 border-surface bg-surface-sunken px-2">
                <LIText
                  size="caption"
                  color="muted"
                  text={`+${overflow}`}
                  className="font-geist-medium"
                />
              </View>
            ) : null}
          </View>
        ) : null}

        <LIText
          size="caption"
          color="muted"
          text={program.assignedLabel}
          numberOfLines={1}
          className="flex-1 font-geist"
        />
        <ChevronRight color={tokens['foreground-subtle']} size={18} />
      </View>
    </LICard>
  );
}

export default memo(ProgramCardBase);
