import { GripVertical } from 'lucide-react-native';
import { memo } from 'react';
import { View } from 'react-native';

import type { ApiProgramBlock } from '@/api/types';
import { LIText } from '@/components/ui';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

interface ProgramBlockRowProps {
  readonly block: ApiProgramBlock;
  /** Rows are one white card per day, so the ends round and the rest divide. */
  readonly first: boolean;
  readonly last: boolean;
}

function ProgramBlockRowBase({ block, first, last }: ProgramBlockRowProps) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-3 bg-white px-4 py-3',
        first && 'rounded-t-card',
        last && 'rounded-b-card',
        !first && 'border-t border-hairline',
      )}
      testID={`program-block-${block.id}`}
    >
      {/*
        Decoration, not a control: reordering is not built yet, so the handle is
        deliberately not a Pressable and is hidden from screen readers rather
        than announcing a drag that does nothing.
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
        <LIText size="caption" color="muted" text={block.rpe} className="font-geist-medium" />
      ) : null}
    </View>
  );
}

export default memo(ProgramBlockRowBase);
