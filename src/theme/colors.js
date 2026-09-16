// Single source of truth for SetTrack colors.
//
// Two palettes, one set of names. Every colour below is named for the job it
// does — `surface`, `foreground`, `border` — rather than for what it looks
// like, because a token called `white` that paints near-black in dark mode is
// a lie told to whoever reads the source next.
//
// Consumed three ways, all from here:
//   - tailwind.config.js turns each name into a CSS variable and emits both
//     palettes into :root and .dark, so `bg-surface` follows the theme with
//     no `dark:` prefix at the call site.
//   - src/theme/tokens.ts exposes the raw values for the few places that
//     cannot take a className — lucide icon `color`, RefreshControl
//     `tintColor`, Skia and SVG.
//   - CLAUDE.md documents the usage rules.
//
// Plain CJS so the Tailwind config can read it without a build step.

/** The named roles. Both palettes must define every one of these. */
const light = {
  // Brand. Violet is primary and accent both.
  violet: '#8B5CF6',
  'violet-pressed': '#7C3AED',
  'violet-weak': '#DFDBF3', // accent-weak: violet 13% into the background
  'violet-line': '#CDBFF3', // accent-line: violet 32% into the background

  // Neutrals, by role.
  background: '#ECEEF2', // the screen behind everything
  surface: '#FFFFFF', // cards and sheets sitting on it
  'surface-sunken': '#F0F2F6', // inputs and unselected controls
  foreground: '#0A0A0A', // headings
  'foreground-muted': '#333333', // body text
  'foreground-subtle': '#6B7280', // captions, secondary detail
  border: '#E7E9EE', // dividers and default borders
  'border-strong': '#D9DCE3', // emphasised borders
  inverse: '#FFFFFF', // text on a violet fill

  // Feedback. Functional only — never used as brand colours.
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#F59E0B',
};

/**
 * Dark is not an inversion.
 *
 * The surfaces lift rather than drop — a card is *lighter* than the screen
 * behind it, which is the opposite of light mode and is what makes depth read
 * on a dark ground. Pure black is avoided: OLED smearing aside, #000 with
 * white text is the highest-contrast pairing there is and reads as a glare in
 * a dim gym.
 *
 * Violet is lifted too. #8B5CF6 on near-black clears WCAG AA for large text
 * but not for the 13px captions this app uses it on, so the accent brightens
 * and the weak/line tints become dark violets rather than pale ones.
 */
const dark = {
  violet: '#A78BFA',
  'violet-pressed': '#C4B5FD',
  'violet-weak': '#2A2440',
  'violet-line': '#3D3459',

  background: '#0B0B0F',
  surface: '#17171C',
  'surface-sunken': '#212128',
  foreground: '#F5F5F7',
  'foreground-muted': '#C9C9D1',
  'foreground-subtle': '#8E8E99',
  border: '#26262E',
  'border-strong': '#33333D',
  inverse: '#0B0B0F',

  // Lifted for the same reason violet is: the light-mode reds and greens are
  // tuned against white and go muddy on a dark ground.
  danger: '#F87171',
  success: '#4ADE80',
  warning: '#FBBF24',
};

/**
 * Roster label swatches. A coach's private filing system, so these are data
 * colours and not brand colours — they identify a label and nothing else.
 *
 * Only slightly lifted in dark mode, and deliberately kept recognisable: a
 * coach learns "amber means new", and a swatch that changes hue between
 * themes breaks that.
 */
const labelsLight = {
  'label-violet': '#8B5CF6',
  'label-amber': '#F59E0B',
  'label-sky': '#0EA5E9',
  'label-green': '#16A34A',
  'label-rose': '#E11D48',
  'label-slate': '#64748B',
};

const labelsDark = {
  'label-violet': '#A78BFA',
  'label-amber': '#FBBF24',
  'label-sky': '#38BDF8',
  'label-green': '#4ADE80',
  'label-rose': '#FB7185',
  'label-slate': '#94A3B8',
};

module.exports = {
  light: { ...light, ...labelsLight },
  dark: { ...dark, ...labelsDark },
  /** Every token name, for the config and for the theme's own type. */
  names: Object.keys({ ...light, ...labelsLight }),
};
