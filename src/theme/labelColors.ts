import { tokens } from './tokens';

/**
 * The six swatches a coach can file a label under. A label's colour arrives
 * from the API as a token *name*, not a hex — so it survives a palette change
 * and can never smuggle an off-palette colour into the app.
 */
export const LABEL_SWATCHES = [
  'label-violet',
  'label-amber',
  'label-sky',
  'label-green',
  'label-rose',
  'label-slate',
] as const;

export type LabelSwatch = (typeof LABEL_SWATCHES)[number];

function isSwatch(name: string): name is LabelSwatch {
  return (LABEL_SWATCHES as readonly string[]).includes(name);
}

/**
 * Resolve a label's token name to a raw value for the one thing NativeWind
 * cannot do — colour a dot from runtime data. An unknown name falls back to
 * slate rather than rendering an invisible dot.
 */
export function labelColorHex(name: string): string {
  return isSwatch(name) ? tokens[name] : tokens['label-slate'];
}
