const rnResolver = require('@react-native/jest-preset/jest/resolver');

/**
 * react-native-worklets' native module cannot load under Jest (Reanimated 4
 * pulls it in via `react-native-reanimated`). Resolving its requests without
 * the `.native.*` extensions picks the plain JS implementation instead.
 * Everything else goes through React Native's own resolver untouched.
 */
module.exports = (request, options) => {
  const isWorklets =
    request.includes('react-native-worklets') ||
    (options.basedir ?? '').includes('react-native-worklets');

  if (!isWorklets) {
    return rnResolver(request, options);
  }

  return rnResolver(request, {
    ...options,
    extensions: options.extensions?.filter((extension) => !extension.includes('native')),
  });
};
