import { ChevronDown, GripVertical, X } from 'lucide-react-native';
import { memo, useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useUnits } from '@/hooks/useUnits';

import type { ApiProgramBlock } from '@/api/types';
import { LIBadge, LIButton, LICard, LICollapsible, LIInput, LIText } from '@/components/ui';
import { timing, useMotion } from '@/theme/motion';
import {
  composeSchemeFor,
  fieldsFor,
  formatDistanceInput,
  formatDurationInput,
  measureHint,
  parseDistanceInput,
  parseDurationInput,
  RPE_PRESCRIBING,
} from '@/lib/measures';
import {
  composeRpe,
  formatTargetKg,
  parseRpe,
  parseScheme,
  parseTargetKg,
} from '@/lib/programs';
import { useThemeTokens } from '@/theme/tokens';

export type BlockPatch = Pick<
  ApiProgramBlock,
  'scheme' | 'rpe' | 'targetKg' | 'targetDistanceKm' | 'targetDurationSeconds' | 'note'
>;

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

/** What the boxes currently hold, as typed. */
interface Draft {
  readonly sets: string;
  readonly reps: string;
  readonly kg: string;
  readonly rpe: string;
  readonly distance: string;
  readonly duration: string;
  /** The cue. "Chest up", not a paragraph — see the input's own note. */
  readonly note: string;
}

/**
 * The row is its own editor. Tapping it expands the fields in place rather
 * than opening a sheet: an inline panel cannot fail to present, it keeps the
 * other exercises visible while you set this one against them, and it is one
 * tap to reach instead of a modal to dismiss.
 *
 * Which boxes appear follows the exercise's measure. A treadmill was being
 * asked for sets, reps and a working weight — three questions nobody can
 * answer — so a field that means nothing here is absent rather than disabled:
 * a greyed-out box still reads as something you are failing to fill in.
 */
function BuilderBlockRowBase({ block, onChange, onCommit, onRemove }: BuilderBlockRowProps) {
  const tokens = useThemeTokens();
  const units = useUnits();
  const { reduced } = useMotion();
  const [open, setOpen] = useState(false);

  // One chevron that turns over, rather than two that swap. A swap is a
  // different glyph on the next frame, which is the same cut the panel used
  // to make — and the two cuts did not even land together.
  const caret = useSharedValue(0);

  useEffect(() => {
    const target = open ? 1 : 0;
    caret.value = reduced ? target : withTiming(target, timing.base);
  }, [caret, open, reduced]);

  const caretStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${caret.value * 180}deg` }],
  }));

  const fields = fieldsFor(block.measure);
  const parsed = parseScheme(block.scheme);
  const [draft, setDraft] = useState<Draft>(() => ({
    sets: String(parsed.sets),
    reps: String(parsed.reps),
    kg: formatTargetKg(block.targetKg),
    rpe: parseRpe(block.rpe),
    distance: formatDistanceInput(block.targetDistanceKm),
    duration: formatDurationInput(block.targetDurationSeconds),
    note: block.note ?? '',
  }));

  const remove = useCallback(() => onRemove(block.id), [onRemove, block.id]);

  /**
   * Written straight through on every keystroke — there is no Save here and
   * nothing to lose by leaving the row. A half-typed field falls back to what
   * the block already held, so clearing a box never writes a zero.
   *
   * Only the fields this measure asks for reach the patch. A run that once had
   * a weight typed into it does not keep prescribing that weight.
   */
  const patchFrom = useCallback(
    (next: Draft): BlockPatch => {
      const sets = Number.parseInt(next.sets, 10);
      const reps = Number.parseInt(next.reps, 10);
      const distanceKm = fields.distance ? parseDistanceInput(next.distance) : null;
      const durationSeconds = fields.duration ? parseDurationInput(next.duration) : null;

      return {
        scheme: composeSchemeFor(block.measure ?? 'load_reps', {
          sets: Number.isFinite(sets) && sets > 0 ? sets : parsed.sets,
          reps: Number.isFinite(reps) && reps > 0 ? reps : parsed.reps,
          distanceKm,
          durationSeconds,
        }),
        rpe: composeRpe(next.rpe),
        targetKg: fields.load ? parseTargetKg(next.kg) : null,
        targetDistanceKm: distanceKm,
        targetDurationSeconds: durationSeconds,
        // An emptied box clears the cue rather than storing a blank one, the
        // same as every other note in this app.
        note: next.note.trim().length > 0 ? next.note.trim() : null,
      };
    },
    [block.measure, fields.distance, fields.duration, fields.load, parsed.reps, parsed.sets],
  );

  /** One handler for six boxes: set the field, then write the whole draft. */
  const edit = useCallback(
    (field: keyof Draft) => (value: string) => {
      setDraft((current) => {
        const next = { ...current, [field]: value };
        onChange(block.id, patchFrom(next));
        return next;
      });
    },
    [block.id, onChange, patchFrom],
  );

  /**
   * Closing the panel is the edit being finished, so it is where an expensive
   * write belongs — see `onCommit`.
   */
  const toggle = useCallback(() => {
    setOpen((current) => {
      if (current) onCommit?.(block.id, patchFrom(draft));
      return !current;
    });
  }, [onCommit, block.id, patchFrom, draft]);

  // The weight only belongs in the summary where the exercise is loaded — a
  // run reading "5 km · 0 kg" states a prescription nobody made.
  const summary =
    fields.load && block.targetKg
      ? `${block.scheme} · ${units.formatWeight(block.targetKg)}`
      : block.scheme;

  return (
    // No `gap` on the card: the collapsed panel is a real child of zero
    // height, and a gap would still be laid out around it — the row would sit
    // twelve pixels taller closed than it used to. The spacing it used to get
    // from the gap is on the panel itself instead.
    <LICard className="px-4 py-3" testID={`builder-block-${block.id}`}>
      <View className="flex-row items-center gap-3">
        {/*
          Decoration, not a control: drag-to-reorder is not built, so the handle
          is not pressable and is hidden from screen readers rather than
          announcing a gesture that does nothing.
        */}
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <GripVertical color={tokens['border-strong']} size={18} />
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
            <Animated.View style={caretStyle}>
              <ChevronDown color={tokens.violet} size={18} />
            </Animated.View>
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
          icon={<X color={tokens['foreground-subtle']} size={18} />}
          accessibilityLabel={`Remove ${block.name}`}
          className="h-9 w-9 gap-0 px-0"
          testID={`builder-remove-${block.id}`}
        />
      </View>

      <LICollapsible open={open} testID={`builder-fields-${block.id}`}>
        <View className="mt-3 gap-2 border-t border-border pt-3">
          {/*
            Wrapping, because a measure asking for four fields on a narrow
            phone is four boxes too cramped to type into otherwise.
          */}
          <View className="flex-row flex-wrap gap-2">
            {fields.sets ? (
              <LIInput
                label="Sets"
                value={draft.sets}
                onChangeText={edit('sets')}
                keyboardType="number-pad"
                selectTextOnFocus
                containerClassName="min-w-16 flex-1"
                testID={`builder-sets-${block.id}`}
              />
            ) : null}

            {fields.reps ? (
              <LIInput
                label="Reps"
                value={draft.reps}
                onChangeText={edit('reps')}
                keyboardType="number-pad"
                selectTextOnFocus
                containerClassName="min-w-16 flex-1"
                testID={`builder-reps-${block.id}`}
              />
            ) : null}

            {fields.load ? (
              <LIInput
                label={units.weight}
                value={draft.kg}
                onChangeText={edit('kg')}
                keyboardType="decimal-pad"
                placeholder="—"
                selectTextOnFocus
                containerClassName="min-w-16 flex-1"
                testID={`builder-kg-${block.id}`}
              />
            ) : null}

            {fields.distance ? (
              <LIInput
                label="km"
                value={draft.distance}
                onChangeText={edit('distance')}
                keyboardType="decimal-pad"
                placeholder="—"
                selectTextOnFocus
                containerClassName="min-w-16 flex-1"
                testID={`builder-distance-${block.id}`}
              />
            ) : null}

            {fields.duration ? (
              <LIInput
                label="Time"
                value={draft.duration}
                onChangeText={edit('duration')}
                // Not a number pad: "1:30" has a colon in it.
                keyboardType="numbers-and-punctuation"
                placeholder="mm:ss"
                selectTextOnFocus
                containerClassName="min-w-20 flex-1"
                testID={`builder-duration-${block.id}`}
              />
            ) : null}

            {/*
              Parked rather than deleted — see `RPE_PRESCRIBING`. `draft.rpe`
              still holds whatever the block arrived with and still goes back
              out through the patch, so an RPE set before this stays set
              instead of being silently dropped on the next edit.
            */}
            {RPE_PRESCRIBING ? (
              <LIInput
                label="RPE"
                value={draft.rpe}
                onChangeText={edit('rpe')}
                keyboardType="decimal-pad"
                placeholder="—"
                selectTextOnFocus
                containerClassName="min-w-16 flex-1"
                testID={`builder-rpe-${block.id}`}
              />
            ) : null}
          </View>

          {/*
            The cue, and the reason this row exists at all: `routine_blocks.note`
            has always been copied into `workout_exercises.coach_note` when a
            workout starts, and the client has always been shown it under the
            lift's name — but nothing anywhere let a coach write one. The field
            was read and never written.

            Full width and last, because it is a sentence among number boxes and
            sharing a row with them would give it about nine characters.
          */}
          <LIInput
            label="Cue"
            value={draft.note}
            onChangeText={edit('note')}
            placeholder="Chest up"
            maxLength={80}
            // Capped short on purpose. It is read mid-set, with a bar in hand,
            // off one line under the exercise name — `exerciseNoteLines`
            // renders it as "Coach note: …" and nothing truncates it there.
            hint="One thing to remember. They see it while they lift."
            testID={`builder-note-${block.id}`}
          />

          <LIText
            size="caption"
            color="muted"
            text={measureHint(block.measure, units.weight)}
            className="font-geist"
          />
        </View>
      </LICollapsible>
    </LICard>
  );
}

export default memo(BuilderBlockRowBase);
