/**
 * Hand-written because colors.js is CJS that tailwind.config.js requires
 * without a build step. Every role appears in both palettes — the shape is
 * what makes `useThemeTokens()` return the same keys whichever theme is on.
 */
interface Palette {
  readonly violet: string;
  readonly 'violet-pressed': string;
  readonly 'violet-weak': string;
  readonly 'violet-line': string;
  readonly background: string;
  readonly surface: string;
  readonly 'surface-sunken': string;
  readonly foreground: string;
  readonly 'foreground-muted': string;
  readonly 'foreground-subtle': string;
  readonly border: string;
  readonly 'border-strong': string;
  readonly inverse: string;
  readonly danger: string;
  readonly success: string;
  readonly warning: string;
  readonly 'label-violet': string;
  readonly 'label-amber': string;
  readonly 'label-sky': string;
  readonly 'label-green': string;
  readonly 'label-rose': string;
  readonly 'label-slate': string;
}

declare const colors: {
  readonly light: Palette;
  readonly dark: Palette;
  readonly names: readonly (keyof Palette)[];
};

export = colors;
