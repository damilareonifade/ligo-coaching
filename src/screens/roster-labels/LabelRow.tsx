import { Pencil, Trash2 } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { View } from 'react-native';

import type { ApiRosterLabel } from '@/api/types';
import { LIButton, LICard, LILabelDot, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useThemeTokens } from '@/theme/tokens';

interface LabelRowProps {
  readonly label: ApiRosterLabel;
  /** Filters the roster by this label and pops back to it. */
  readonly onPress: (label: ApiRosterLabel) => void;
  readonly onRename: (label: ApiRosterLabel) => void;
  readonly onDelete: (label: ApiRosterLabel) => void;
  readonly first: boolean;
  readonly last: boolean;
}

function LabelRow({ label, onPress, onRename, onDelete, first, last }: LabelRowProps) {
  const tokens = useThemeTokens();
  const open = useCallback(() => onPress(label), [onPress, label]);
  const rename = useCallback(() => onRename(label), [onRename, label]);
  const remove = useCallback(() => onDelete(label), [onDelete, label]);

  return (
    <LICard
      onPress={open}
      className={cn(
        'gap-0 rounded-none px-4 py-3',
        first && 'rounded-t-card',
        last && 'rounded-b-card',
        !first && 'border-t border-border',
      )}
      testID={`label-row-${label.id}`}
    >
      <View className="flex-row items-center gap-3">
        <LILabelDot color={label.color} size="lg" />

        <View className="flex-1 gap-0.5">
          <LIText
            size="p"
            color="primary"
            text={label.name}
            numberOfLines={1}
            className="font-geist-medium"
          />
          <LIText
            size="caption"
            color="muted"
            text={`${label.count} ${label.count === 1 ? 'client' : 'clients'}`}
            className="font-geist"
          />
        </View>

        <LIButton
          title=""
          onPress={rename}
          variant="ghost"
          size="sm"
          shape="pill"
          icon={<Pencil color={tokens['foreground-subtle']} size={18} />}
          accessibilityLabel={`Rename ${label.name}`}
          className="h-10 w-10 gap-0 px-0"
          testID={`label-rename-${label.id}`}
        />
        <LIButton
          title=""
          onPress={remove}
          variant="ghost"
          size="sm"
          shape="pill"
          icon={<Trash2 color={tokens.danger} size={18} />}
          accessibilityLabel={`Delete ${label.name}`}
          className="h-10 w-10 gap-0 px-0"
          testID={`label-delete-${label.id}`}
        />
      </View>
    </LICard>
  );
}

export default memo(LabelRow);
