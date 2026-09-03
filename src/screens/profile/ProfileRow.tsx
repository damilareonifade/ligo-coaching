import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import type { ApiSettingsRow } from '@/api/types';
import { LIText } from '@/components/ui';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

interface ProfileRowProps {
  readonly row: ApiSettingsRow;
  readonly onPress: () => void;
  /** Rows after the first draw a hairline above, so cards read as one list. */
  readonly divided?: boolean;
}

/**
 * One settings line. Coach rows and every settings group share this anatomy —
 * label over description, the current value on the right, a chevron — so the
 * whole profile reads as a single list even though it is many cards.
 */
export default function ProfileRow({ row, onPress, divided = false }: ProfileRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={row.desc ? `${row.label}. ${row.desc}` : row.label}
      className={cn(
        'flex-row items-center gap-3 py-3 active:opacity-70',
        divided && 'border-t border-hairline',
      )}
      testID={`profile-row-${row.id}`}
    >
      <View className="flex-1 gap-0.5">
        <LIText
          size="p"
          color={row.danger ? 'danger' : 'primary'}
          text={row.label}
          className="font-geist-medium"
        />
        {row.desc ? (
          <LIText size="caption" color="muted" text={row.desc} className="font-geist" />
        ) : null}
      </View>

      {row.value ? (
        <LIText
          size="caption"
          color="muted"
          text={row.value}
          className="text-right font-geist"
          numberOfLines={1}
        />
      ) : null}

      <ChevronRight color={tokens.muted} size={18} />
    </Pressable>
  );
}
