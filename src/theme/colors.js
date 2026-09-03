// Single source of truth for Ligo colors.
// Consumed by tailwind.config.js (require) and by TS via src/theme/tokens.ts.
// Plain CJS so the Tailwind config can read it without a build step.
module.exports = {
  // Brand
  navy: '#0A3D62',
  teal: '#48CAE4',
  sky: '#EBF4FB',
  midnight: '#0D1B2A',
  'light-teal': '#E1F5EE',
  gray: '#F1EFE8',
  'dark-gray': '#333333',
  white: '#FFFFFF',

  // Semantic aliases — now point at the Violet palette (legacy brand keys above
  // stay defined for un-migrated code, but nothing semantic references them).
  primary: '#8B5CF6', // violet
  'primary-pressed': '#7C3AED', // violet-pressed
  accent: '#8B5CF6', // violet
  background: '#ECEEF2', // canvas
  surface: '#FFFFFF', // white — cards are white now
  'surface-dark': '#0D1B2A',
  border: '#E7E9EE', // hairline
  foreground: '#333333',
  muted: '#6B7280',

  // Functional (feedback states only — not brand colors)
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#F59E0B',

  // Violet — the current brand palette, primary AND accent. Originally pulled
  // from the "Ligo Client App" design (Claude Design canvas, palette="violet").
  // The semantic aliases above all resolve here; the Brand block at the top of
  // this file is legacy and kept only so un-migrated code still compiles.
  // See CLAUDE.md → "Color Palette & Design Tokens".
  violet: '#8B5CF6',
  'violet-pressed': '#7C3AED', // pressed/active state for violet surfaces
  'violet-weak': '#DFDBF3', // accent-weak: violet 13% into canvas
  'violet-line': '#CDBFF3', // accent-line: violet 32% into canvas
  canvas: '#ECEEF2', // cool-neutral screen background (violet-flow alternative to `sky`)
  field: '#F0F2F6', // input / unselected-control fill
  hairline: '#E7E9EE', // cool-neutral border (violet-flow alternative to `gray`)
  'hairline-strong': '#D9DCE3', // emphasized border
  ink: '#0A0A0A', // near-black heading text (violet-flow alternative to `navy`/`dark-gray`)
};
