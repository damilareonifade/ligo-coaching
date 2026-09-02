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

  // Semantic aliases
  primary: '#0A3D62',
  'primary-pressed': '#0D1B2A',
  accent: '#48CAE4',
  background: '#FFFFFF',
  surface: '#EBF4FB',
  'surface-dark': '#0D1B2A',
  border: '#F1EFE8',
  foreground: '#333333',
  muted: '#6B7280',

  // Functional (feedback states only — not brand colors)
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#F59E0B',
};
