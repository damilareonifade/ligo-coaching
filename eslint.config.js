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
]);
