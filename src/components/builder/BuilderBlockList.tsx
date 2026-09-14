import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback } from 'react';
import { View } from 'react-native';

import { LIButton, LICard, LIText } from '@/components/ui';
import { setsLabel } from '@/lib/programs';
import { selectDraftDay, useProgramDraftStore } from '@/store/programDraftStore';
import { tokens } from '@/theme/tokens';

import BuilderBlockRow from './BuilderBlockRow';

/** The blocks on the day currently selected, and the way to add another. */
export default function BuilderBlockList() {
  const router = useRouter();
  const kind = useProgramDraftStore((state) => state.kind);
  const day = useProgramDraftStore(selectDraftDay);
  const removeBlock = useProgramDraftStore((state) => state.removeBlock);

  // No programId: the picker adds straight to the draft, not to a saved program.
  const openPicker = useCallback(() => router.push('/programs/picker'), [router]);

  const blocks = day?.blocks ?? [];
  const heading = kind === 'routine' ? 'EXERCISES' : (day?.label ?? 'DAY 1').toUpperCase();

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between px-1">
        <LIText
          size="caption"
          color="muted"
          text={heading}
          className="font-geist-medium uppercase tracking-wide"
        />
        <LIText
          size="caption"
          color="muted"
          text={setsLabel(blocks)}
          className="font-geist-medium"
        />
      </View>

      {blocks.length === 0 ? (
        <LICard>
          <LIText
            size="caption"
            color="muted"
            text="Nothing here yet. Add the first exercise below."
            className="font-geist"
          />
        </LICard>
      ) : (
        <View className="gap-2">
          {blocks.map((block) => (
            <BuilderBlockRow key={block.id} block={block} onRemove={removeBlock} />
          ))}
        </View>
      )}

      <LIButton
        title="Add exercise"
        onPress={openPicker}
        variant="ghost"
        shape="rounded"
        fullWidth
        icon={<Plus color={tokens.violet} size={18} />}
        className="border border-dashed border-violet-line"
        labelClassName="font-geist-medium"
        testID="builder-add-exercise"
      />
    </View>
  );
}
