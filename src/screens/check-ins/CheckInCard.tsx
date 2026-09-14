import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { useUnits } from '@/hooks/useUnits';

import type { ApiCheckIn } from '@/api/types';
import { LIBadge, LIButton, LICard, LIText } from '@/components/ui';

interface CheckInCardProps {
  readonly entry: ApiCheckIn;
  /** Set when a coach is reading a client's — carried into the editor. */
  readonly clientId?: string;
}

/** A drop reads as progress here; "—" is the first month, with nothing to compare. */
function deltaColor(delta: string): 'success' | 'muted' {
  return delta.startsWith('−') ? 'success' : 'muted';
}

export default function CheckInCard({ entry, clientId }: CheckInCardProps) {
  const units = useUnits();
  const router = useRouter();

  const edit = useCallback(
    () =>
      router.push({
        pathname: '/check-ins/edit',
        // Whose, so the editor writes to the right person. Absent is the
        // caller's own.
        params: clientId ? { id: entry.id, clientId } : { id: entry.id },
      }),
    [clientId, entry.id, router],
  );

  return (
    <LICard className="gap-3" testID={`check-in-${entry.id}`}>
      <View className="flex-row items-center gap-3">
        <LIText
          size="h5"
          color="primary"
          text={entry.label}
          className="flex-1 font-geist-semibold"
        />
        <LIText
          size="p"
          color="body"
          text={units.formatWeight(Number(entry.weightKg))}
          className="font-geist-medium"
        />
        <LIText
          size="caption"
          color={deltaColor(entry.delta)}
          text={entry.delta}
          className="w-12 text-right font-geist-medium"
        />
      </View>

      <View className="flex-row flex-wrap gap-y-2">
        {entry.cells.map((cell) => (
          <View key={cell.label} className="w-1/2 flex-row items-center gap-2 pr-3">
            <LIText size="caption" color="muted" text={cell.label} className="flex-1 font-geist" />
            <LIText
              size="caption"
              color="body"
              text={cell.value}
              className="font-geist-medium"
            />
          </View>
        ))}
      </View>

      {entry.note.length > 0 ? (
        <LIText size="caption" color="body" text={entry.note} className="font-geist" />
      ) : null}

      <View className="flex-row items-center gap-2 border-t border-border pt-3">
        <LIBadge
          tone={entry.by === 'coach' ? 'violet' : 'neutral'}
          label={entry.by === 'coach' ? 'Coach' : 'You'}
          labelClassName="font-geist-medium"
        />
        <LIText
          size="caption"
          color="muted"
          text={entry.byLine}
          numberOfLines={1}
          className="flex-1 font-geist"
        />
        {entry.photos > 0 ? (
          <LIText
            size="caption"
            color="muted"
            text={`${entry.photos} photo${entry.photos === 1 ? '' : 's'}`}
            className="font-geist"
          />
        ) : null}
        <LIButton
          title="Edit"
          size="sm"
          variant="outline"
          onPress={edit}
          accessibilityLabel={`Edit ${entry.label}`}
          testID={`check-in-edit-${entry.id}`}
        />
      </View>
    </LICard>
  );
}
