import { GripVertical, X } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { View } from 'react-native';

import type { ApiProgramBlock } from '@/api/types';
import { LIBadge, LIButton, LICard, LIText } from '@/components/ui';
import { tokens } from '@/theme/tokens';

interface BuilderBlockRowProps {
  readonly block: ApiProgramBlock;
  readonly onRemove: (blockId: string) => void;
}

function BuilderBlockRowBase({ block, onRemove }: BuilderBlockRowProps) {
  const remove = useCallback(() => onRemove(block.id), [onRemove, block.id]);

  return (
    <LICard className="flex-row items-center gap-3 px-4 py-3" testID={`builder-block-${block.id}`}>
      {/*
        Decoration, not a control: drag-to-reorder is not built, so the handle
        is not pressable and is hidden from screen readers rather than
        announcing a gesture that does nothing.
      */}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <GripVertical color={tokens['hairline-strong']} size={18} />
      </View>

      <View className="flex-1 gap-0.5">
        <LIText
          size="p"
          color="primary"
          text={block.name}
          numberOfLines={1}
          className="font-geist-medium"
        />
        <LIText size="caption" color="muted" text={block.scheme} className="font-geist" />
      </View>

      {block.rpe.length > 0 ? (
        <LIBadge tone="neutral" label={block.rpe} labelClassName="font-geist-medium" />
      ) : null}

      <LIButton
        title=""
        onPress={remove}
        variant="ghost"
        size="sm"
        icon={<X color={tokens.muted} size={18} />}
        accessibilityLabel={`Remove ${block.name}`}
        className="h-9 w-9 gap-0 px-0"
        testID={`builder-remove-${block.id}`}
      />
    </LICard>
  );
}

export default memo(BuilderBlockRowBase);
