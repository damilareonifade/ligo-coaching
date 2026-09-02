import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './client';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          // A 4xx will not fix itself — only retry transport/server failures.
          if (error instanceof ApiError && error.status !== null && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: { retry: 0 },
    },
  });
}
