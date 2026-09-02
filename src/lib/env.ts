import { z } from 'zod';

/**
 * Public runtime config. Only `EXPO_PUBLIC_*` vars are inlined into the bundle,
 * so nothing here may be a secret. Parsed once at module load so a bad value
 * fails loudly at startup rather than at the first request.
 */
const envSchema = z.object({
  apiUrl: z.url(),
  useMocks: z.boolean(),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse({
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.ligo.app',
  useMocks: (process.env.EXPO_PUBLIC_USE_MOCKS ?? 'true') === 'true',
});

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${z.prettifyError(parsed.error)}`);
}

export const env: Env = parsed.data;
