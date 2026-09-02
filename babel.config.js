module.exports = function (api) {
  api.cache(true);
  return {
    // react-native-worklets/plugin is injected automatically by babel-preset-expo
    // when react-native-reanimated 4 is installed — do not add it manually.
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
