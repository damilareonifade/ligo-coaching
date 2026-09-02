import colors from './colors';

/**
 * Raw color values, for the few places that cannot take a `className`:
 * Skia charts, navigation theme, status bar, icon `color` props.
 * Everywhere else, use Tailwind tokens via `className`.
 */
export const tokens = colors;

export const radii = {
  card: 16,
  pill: 999,
} as const;

/** Spacing in px, mirroring the Tailwind scale we use most. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
