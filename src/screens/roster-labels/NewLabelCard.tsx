import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useCreateLabelMutation } from '@/api/roster';
import { LIButton, LICard, LIInput, LILabelDot, LIText } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/uiStore';
import { LABEL_SWATCHES } from '@/theme/labelColors';

/** Spoken names for the swatches — a colour needs a word to be pickable blind. */
const swatchName: Record<string, string> = {
  'label-violet': 'Violet',
  'label-amber': 'Amber',
  'label-sky': 'Sky',
  'label-green': 'Green',
  'label-rose': 'Rose',
  'label-slate': 'Slate',
};

export default function NewLabelCard() {
  const showToast = useUiStore((state) => state.showToast);
  const { mutate: createLabel, isPending } = useCreateLabelMutation();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(LABEL_SWATCHES[0]);

  const trimmed = name.trim();

  const add = useCallback(() => {
    createLabel(
      { name: trimmed, color },
      { onError: (error) => showToast(errorMessage(error), 'danger') },
    );
    setName('');
  }, [createLabel, trimmed, color, showToast]);

  return (
    <View className="gap-2">
      <LIText
        size="caption"
        color="muted"
        text="NEW LABEL"
        className="px-1 font-geist-medium uppercase tracking-wide"
      />

      <LICard className="gap-4">
        <LIInput
          value={name}
          onChangeText={setName}
          placeholder="Name it, e.g. Off-season"
          accessibilityLabel="Label name"
          autoCapitalize="sentences"
          returnKeyType="done"
          testID="new-label-name"
        />

        <View className="gap-2">
          <LIText size="caption" color="muted" text="Colour" className="font-geist" />
          <View className="flex-row gap-2">
            {LABEL_SWATCHES.map((swatch) => (
              <LIButton
                key={swatch}
                title=""
                onPress={() => setColor(swatch)}
                variant="ghost"
                size="sm"
                shape="pill"
                icon={<LILabelDot color={swatch} size="lg" />}
                accessibilityLabel={`${swatchName[swatch] ?? swatch} label colour`}
                className={cn(
                  'h-11 w-11 gap-0 border-2 border-transparent px-0',
                  swatch === color && 'border-violet',
                )}
                testID={`new-label-swatch-${swatch}`}
              />
            ))}
          </View>
        </View>

        <View className="gap-2">
          <LIText size="caption" color="muted" text="Preview" className="font-geist" />
          {/* A View, not an LIChip: the preview is not something you can press,
              and a chip that answers to a screen reader as a button would lie. */}
          <View className="flex-row items-center gap-2 self-start rounded-pill border border-border bg-surface-sunken px-4 py-2">
            <LILabelDot color={color} />
            <LIText
              size="caption"
              color="body"
              text={trimmed.length > 0 ? trimmed : 'Off-season'}
              className="font-geist-medium"
            />
          </View>
        </View>

        <LIButton
          title="Add label"
          onPress={add}
          disabled={trimmed.length === 0}
          loading={isPending}
          fullWidth
          testID="new-label-submit"
        />
      </LICard>
    </View>
  );
}
