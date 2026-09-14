import { useColorScheme } from 'nativewind';

import colors from './colors';

export type ThemeName = 'light' | 'dark';
export type ThemeTokens = (typeof colors)['light'];

export const palettes: Readonly<Record<ThemeName, ThemeTokens>> = {
  light: colors.light,
  dark: colors.dark,
};

/**
 * Raw colour values, for the few places that cannot take a `className`:
 * lucide icon `color`, `RefreshControl` `tintColor`, Skia charts, SVG stroke
 * and fill, and the navigation theme.
 *
 * **Use `useThemeTokens()` in components.** This constant is the light
 * palette and does not follow the theme — it exists for module scope, where
 * there are no hooks: a `cva` variant table, a default argument, a value
 * computed once at import. Anything rendered has a hook available and should
 * use it, or it will keep painting light colours on a dark screen.
 */
export const tokens = colors.light;

/**
 * The palette for whichever theme is showing.
 *
 * A hook rather than a module read, because the answer changes while the app
 * is running — the system flips at sunset, or somebody picks Dark in
 * Settings — and a component holding a value from import time never hears
 * about it. Reading it here is also what re-renders the icon.
 */
export function useThemeTokens(): ThemeTokens {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? palettes.dark : palettes.light;
}

/** Whether the dark palette is showing, for the handful of places that branch. */
export function useIsDark(): boolean {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark';
}

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
