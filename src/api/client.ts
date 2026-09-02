import { AxiosError, create as createAxios, type AxiosInstance } from 'axios';

import { env } from '@/lib/env';

import { getAuthToken } from './authToken';

/** Every failure the UI sees is one of these — never a raw AxiosError. */
export class ApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const client: AxiosInstance = createAxios({
  baseURL: env.apiUrl,
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function messageFromBody(body: unknown): string | null {
  if (typeof body === 'string' && body.length > 0) return body;
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const { message } = body as { message: unknown };
    if (typeof message === 'string') return message;
  }
  return null;
}

client.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (error instanceof AxiosError) {
      const status = error.response?.status ?? null;
      const message =
        messageFromBody(error.response?.data) ??
        (error.code === 'ECONNABORTED'
          ? 'The request timed out. Check your connection and try again.'
          : 'Something went wrong. Please try again.');
      return Promise.reject(new ApiError(message, status));
    }
    return Promise.reject(new ApiError('Something went wrong. Please try again.', null));
  },
);

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
