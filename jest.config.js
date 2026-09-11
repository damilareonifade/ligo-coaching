const expoPreset = require('jest-expo/jest-preset');

/**
 * Packages that ship untransformed ESM/TS and must go through Babel.
 * The first entry mirrors jest-expo's own allowlist plus Ligo's additions.
 */
const transformAllowlist = [
  // jest-expo defaults
  '.pnpm',
  'react-native',
  '@react-native',
  '@react-native-community',
  'expo',
  '@expo',
  '@expo-google-fonts',
  'react-navigation',
  '@react-navigation',
  '@sentry/react-native',
  'native-base',
  'standard-navigation',
  // Ligo: styling, lists, sheets, charts
  'nativewind',
  'react-native-url-polyfill',
  'react-native-css',
  'react-native-css-interop',
  'react-native-reanimated',
  'react-native-worklets',
  'react-native-gesture-handler',
  'react-native-safe-area-context',
  'react-native-svg',
  '@shopify/flash-list',
  '@shopify/react-native-skia',
  '@gorhom/bottom-sheet',
  'victory-native',
  'lucide-react-native',
  // victory-native's d3 dependencies, and their own ESM-only deps
  'd3-scale',
  'd3-shape',
  'd3-zoom',
  'd3-array',
  'd3-color',
  'd3-dispatch',
  'd3-drag',
  'd3-ease',
  'd3-format',
  'd3-interpolate',
  'd3-path',
  'd3-selection',
  'd3-time',
  'd3-time-format',
  'd3-transition',
  'internmap',
  'its-fine',
];

/** @type {import('jest').Config} */
module.exports = {
  ...expoPreset,
  setupFiles: [
    ...expoPreset.setupFiles,
    // EXPO_PUBLIC_* vars that src/lib/env.ts requires; Jest loads no .env file.
    '<rootDir>/jest/env.js',
    // Skia is native-only; its own mock keeps victory-native importable in tests.
    '<rootDir>/node_modules/@shopify/react-native-skia/jestSetup.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  resolver: '<rootDir>/jest/resolver.js',
  transformIgnorePatterns: [
    `/node_modules/(?!(${transformAllowlist.join('|')}))`,
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  moduleNameMapper: {
    // lucide resolves to ESM .mjs under the react-native condition, which
    // jest-expo does not transform — point Jest at its CJS build instead.
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
