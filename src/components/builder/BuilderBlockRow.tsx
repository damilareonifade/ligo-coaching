import { ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react-native';
import { memo, useCallback, useState } from 'react';
import { View } from 'react-native';
import { useUnits } from '@/hooks/useUnits';

import type { ApiProgramBlock } from '@/api/types';
import { LIBadge, LIButton, LICard, LIInput, LIText } from '@/components/ui';
import {
  composeRpe,
  composeScheme,
  formatTargetKg,
  parseRpe,
  parseScheme,
  parseTargetKg,
} from '@/lib/programs';
import { tokens } from '@/theme/tokens';

export type BlockPatch = Pick<ApiProgramBlock, 'scheme' | 'rpe' | 'targetKg'>;

interface BuilderBlockRowProps {
  readonly block: ApiProgramBlock;
  /** Fired on every keystroke — cheap for a caller writing to a local draft. */
  readonly onChange: (blockId: string, patch: BlockPatch) => void;
  /**
   * Fired once when the fields are closed. A caller whose write is expensive —
   * a saved program, where every edit is a round trip — uses this instead of
   * `onChange` rather than saving on each character.
   */
  readonly onCommit?: (blockId: string, patch: BlockPatch) => void;
  readonly onRemove: (blockId: string) => void;
}

/**
 * The row is its own editor. Tapping it expands the fields in place rather
 * than opening a sheet: an inline panel cannot fail to present, it keeps the
 * other exercises visible while you set this one against them, and it is one
 * tap to reach instead of a modal to dismiss.
 */
function BuilderBlockRowBase({ block, onChange, onCommit, onRemove }: BuilderBlockRowProps) {
  const units = useUnits();
  const [open, setOpen] = useState(false);

  const parsed = parseScheme(block.scheme);
  const [sets, setSets] = useState(() => String(parsed.sets));
  const [reps, setReps] = useState(() => String(parsed.reps));
  const [kg, setKg] = useState(() => formatTargetKg(block.targetKg));
  const [rpe, setRpe] = useState(() => parseRpe(block.rpe));

  const remove = useCallback(() => onRemove(block.id), [onRemove, block.id]);

  /**
   * Written straight through on every keystroke — there is no Save here and
   * nothing to lose by leaving the row. A half-typed field falls back to what
   * the block already held, so clearing a box never writes a zero.
   */
  const patchFrom = useCallback(
    (next: { sets?: string; reps?: string; kg?: string; rpe?: string }): BlockPatch => {
      const nextSets = Number.parseInt(next.sets ?? sets, 10);
      const nextReps = Number.parseInt(next.reps ?? reps, 10);

      return {
        scheme: composeScheme(
          Number.isFinite(nextSets) && nextSets > 0 ? nextSets : parsed.sets,
          Number.isFinite(nextReps) && nextReps > 0 ? nextReps : parsed.reps,
        ),
        rpe: composeRpe(next.rpe ?? rpe),
        targetKg: parseTargetKg(next.kg ?? kg),
      };
    },
    [sets, reps, kg, rpe, parsed.sets, parsed.reps],
  );

  const commit = useCallback(
    (next: { sets?: string; reps?: string; kg?: string; rpe?: string }) => {
      onChange(block.id, patchFrom(next));
    },
    [block.id, onChange, patchFrom],
  );

  /**
   * Closing the panel is the edit being finished, so it is where an expensive
   * write belongs — see `onCommit`.
   */
  const toggle = useCallback(() => {
    setOpen((current) => {
      if (current) onCommit?.(block.id, patchFrom({}));
      return !current;
    });
  }, [onCommit, block.id, patchFrom]);

  const summary = block.targetKg
    ? `${block.scheme} · ${units.formatWeight(block.targetKg)}`
    : block.scheme;

  return (
    <LICard className="gap-3 px-4 py-3" testID={`builder-block-${block.id}`}>
      <View className="flex-row items-center gap-3">
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
          <LIText size="caption" color="muted" text={summary} className="font-geist" />
        </View>

        {block.rpe.length > 0 ? (
          <LIBadge tone="neutral" label={block.rpe} labelClassName="font-geist-medium" />
        ) : null}

        <LIButton
          title=""
          onPress={toggle}
          variant="ghost"
          size="sm"
          icon={
            open ? (
              <ChevronUp color={tokens.violet} size={18} />
            ) : (
              <ChevronDown color={tokens.violet} size={18} />
            )
          }
          accessibilityLabel={open ? `Hide ${block.name} fields` : `Edit ${block.name}`}
          className="h-9 w-9 gap-0 px-0"
          testID={`builder-edit-${block.id}`}
        />

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
      </View>

      {open ? (
        <View className="gap-2 border-t border-hairline pt-3">
          <View className="flex-row gap-2">
            <LIInput
              label="Sets"
              value={sets}
              onChangeText={(value) => {
                setSets(value);
                commit({ sets: value });
              }}
              keyboardType="number-pad"
              selectTextOnFocus
              containerClassName="flex-1"
              testID={`builder-sets-${block.id}`}
            />
            <LIInput
              label="Reps"
              value={reps}
              onChangeText={(value) => {
                setReps(value);
                commit({ reps: value });
              }}
              keyboardType="number-pad"
              selectTextOnFocus
              containerClassName="flex-1"
              testID={`builder-reps-${block.id}`}
            />
            <LIInput
              label={units.weight}
              value={kg}
              onChangeText={(value) => {
                setKg(value);
                commit({ kg: value });
              }}
              keyboardType="decimal-pad"
              placeholder="—"
              selectTextOnFocus
              containerClassName="flex-1"
              testID={`builder-kg-${block.id}`}
            />
            <LIInput
              label="RPE"
              value={rpe}
              onChangeText={(value) => {
                setRpe(value);
                commit({ rpe: value });
              }}
              keyboardType="decimal-pad"
              placeholder="—"
              selectTextOnFocus
              containerClassName="flex-1"
              testID={`builder-rpe-${block.id}`}
            />
          </View>

          <LIText
            size="caption"
            color="muted"
            text="kg and RPE are optional. Leave them blank and nothing is prescribed."
            className="font-geist"
          />
        </View>
      ) : null}
    </LICard>
  );
}

export default memo(BuilderBlockRowBase);
