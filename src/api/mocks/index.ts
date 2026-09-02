/**
 * Mock transport used when EXPO_PUBLIC_USE_MOCKS=true, so the app runs before
 * the backend exists. Every endpoint module branches on `env.useMocks` and
 * calls through here; nothing else in the app knows mocks exist.
 */
const LATENCY_MS = 350;

export function mockDelay<T>(value: T, latency: number = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), latency);
  });
}

export * from './fixtures';
