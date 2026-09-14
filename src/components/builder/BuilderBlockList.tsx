import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback } from 'react';
import { View } from 'react-native';

import { LIButton, LICard, LIText } from '@/components/ui';
import { setsLabel } from '@/lib/programs';
import { selectDraftRoutine, useProgramDraftStore } from '@/store/programDraftStore';
import { useThemeTokens } from '@/theme/tokens';

import BuilderBlockRow from './BuilderBlockRow';

/** The exercises in the selected routine, and the way to add another. */
export default function BuilderBlockList() {
  const tokens = useThemeTokens();
  const router = useRouter();
  const kind = useProgramDraftStore((state) => state.kind);
  const routine = useProgramDraftStore(selectDraftRoutine);
  const removeBlock = useProgramDraftStore((state) => state.removeBlock);
  const updateBlock = useProgramDraftStore((state) => state.updateBlock);

  // No programId: the picker adds straight to the draft, not to a saved program.
  const openPicker = useCallback(() => router.push('/programs/picker'), [router]);

  const blocks = routine?.blocks ?? [];
  const heading = kind === 'routine' ? 'EXERCISES' : (routine?.name ?? 'ROUTINE 1').toUpperCase();

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
            <BuilderBlockRow
              key={block.id}
              block={block}
              onChange={updateBlock}
              onRemove={removeBlock}
            />
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
