const plugin = require('tailwindcss/plugin');

const { light, dark, names } = require('./src/theme/colors');

/** '#8B5CF6' → '139 92 246', the channel form `<alpha-value>` needs. */
function channels(hex) {
  const value = hex.replace('#', '');
  const int = parseInt(
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value,
    16,
  );
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

function varsFor(palette) {
  return Object.fromEntries(
    Object.entries(palette).map(([name, hex]) => [`--color-${name}`, channels(hex)]),
  );
}

/**
 * Every token resolves through a CSS variable, so `bg-surface` follows the
 * theme without a `dark:` prefix at any of the ~570 call sites. The channel
 * form is what lets `bg-foreground/40` and `bg-danger/10` keep working.
 */
const themeColors = Object.fromEntries(
  names.map((name) => [name, `rgb(var(--color-${name}) / <alpha-value>)`]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: themeColors,
      // Onboarding/signup flow only — see AGENTS.md scope. One family per
      // weight file (src/app/_layout.tsx loads them via expo-font).
      fontFamily: {
        geist: ['Geist-Regular'],
        'geist-medium': ['Geist-Medium'],
        'geist-semibold': ['Geist-SemiBold'],
        'geist-bold': ['Geist-Bold'],
      },
      fontSize: {
        h1: ['32px', { lineHeight: '38px' }],
        h2: ['26px', { lineHeight: '32px' }],
        h3: ['22px', { lineHeight: '28px' }],
        h4: ['18px', { lineHeight: '24px' }],
        h5: ['16px', { lineHeight: '22px' }],
        p: ['15px', { lineHeight: '22px' }],
        caption: ['13px', { lineHeight: '18px' }],
      },
      borderRadius: {
        card: '16px',
        pill: '999px',
      },
    },
  },
  plugins: [
    // Both palettes emitted from src/theme/colors.js rather than hand-written
    // in global.css, so there is one place a colour is defined and no second
    // copy to drift.
    plugin(({ addBase }) => {
      addBase({
        ':root': varsFor(light),
        '.dark:root': varsFor(dark),
        '.dark': varsFor(dark),
      });
    }),
  ],
};
