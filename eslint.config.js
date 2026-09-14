const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
  {
    // Scoped to TS: eslint-config-expo only registers @typescript-eslint here.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['Text', 'TextInput', 'Image', 'FlatList', 'Button', 'TouchableOpacity'],
              message:
                'Use the LI wrappers from @/components/ui instead (LIText, LIInput, LIImage, LIList, LIButton).',
            },
            {
              name: 'react-native',
              importNames: ['Animated'],
              message: 'Use react-native-reanimated instead of the legacy Animated API.',
            },
          ],
        },
      ],
    },
  },
  {
    // The wrappers are the one place allowed to touch RN primitives directly.
    files: ['src/components/ui/**/*.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    /**
     * A screen folder owns its own sections and nothing else. The moment a
     * second screen wants one, it stops being that screen's and belongs in
     * `src/components/<domain>/` — otherwise the borrower is coupled to a
     * screen it has no other relationship with, and neither folder can be
     * changed safely.
     *
     * Siblings inside a screen are imported relatively (`./Foo`), so this
     * pattern only ever catches a reach across the boundary. Route files in
     * `src/app/` are unaffected: composing screens is their job.
     */
    files: ['src/screens/**/*.ts', 'src/screens/**/*.tsx'],
    // A test names its subject by alias like every other test in the repo;
    // that is not a screen reaching across a boundary.
    ignores: ['src/screens/**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/screens/*/*'],
              message:
                'Screens must not import each other. A component used by more than one screen belongs in src/components/<domain>/; one used by a single screen stays beside it and is imported relatively.',
            },
          ],
        },
      ],
    },
  },
]);
