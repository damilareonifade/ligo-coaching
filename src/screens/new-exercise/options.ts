import type { LIChipOption } from '@/components/ui';

/** The three things an exercise has to declare before it can be programmed. */

export const MUSCLE_OPTIONS: readonly LIChipOption[] = [
  'Quads',
  'Hamstrings',
  'Glutes',
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Core',
].map((label) => ({ label, value: label }));

export const EQUIPMENT_OPTIONS: readonly LIChipOption[] = [
  'Barbell',
  'Dumbbell',
  'Machine',
  'Cable',
  'Bodyweight',
].map((label) => ({ label, value: label }));

export const TRACKS_OPTIONS: readonly LIChipOption[] = [
  'Weight × reps',
  'Reps only',
  'Time',
  'Distance',
].map((label) => ({ label, value: label }));
