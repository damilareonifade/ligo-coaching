
// MMKV is a native module — back the persisted stores with an in-memory map.
jest.mock('react-native-mmkv', () => {
  const store = new Map<string, string>();
  return {
    createMMKV: () => ({
      set: (key: string, value: string) => store.set(key, String(value)),
      getString: (key: string) => store.get(key),
      remove: (key: string) => store.delete(key),
      clearAll: () => store.clear(),
      contains: (key: string) => store.has(key),
      getAllKeys: () => [...store.keys()],
    }),
  };
});

// Safe-area insets come from the native view hierarchy, which Jest has none
// of — `useSafeAreaInsets` throws without a provider above it. The library
// ships this mock for exactly that; it is global rather than per-test because
// `LIDialog` and `LISafeArea` are in most trees.
// `.default` because the shipped mock is a default export, and Babel's interop
// would otherwise hand back `{ default: {...} }` with no `useSafeAreaInsets`
// on it.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

// expo-crypto reaches the platform CSPRNG, which Jest has no bridge to — the
// real `randomUUID` returns undefined here. A counter is enough: the tests
// that use it only care that two ids differ and that the shape is a UUID.
jest.mock('expo-crypto', () => {
  let issued = 0;
  return {
    randomUUID: () => {
      issued += 1;
      return `00000000-0000-4000-8000-${String(issued).padStart(12, '0')}`;
    },
  };
});
