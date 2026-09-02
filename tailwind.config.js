const colors = require('./src/theme/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // NOTE: `gray` intentionally replaces Tailwind's default gray *scale*
      // with the single brand neutral, so `bg-gray-100` etc. do not exist.
      colors,
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
  plugins: [],
};
