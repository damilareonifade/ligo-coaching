import { z } from 'zod';

/**
 * Public runtime config. Only `EXPO_PUBLIC_*` vars are inlined into the bundle,
 * so nothing here may be a secret. Parsed once at module load so a bad value
 * fails loudly at startup rather than at the first request.
 *
 * `supabaseKey` is the publishable key (`sb_publishable_…`), which is public by
 * design — Row Level Security on each table is the security boundary. A
 * service_role/secret key must never appear in an `EXPO_PUBLIC_*` var.
 */
const envSchema = z.object({
  apiUrl: z.url(),
  useMocks: z.boolean(),
  supabaseUrl: z.url(),
  supabaseKey: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse({
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.ligo.app',
  useMocks: (process.env.EXPO_PUBLIC_USE_MOCKS ?? 'true') === 'true',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_KEY,
});

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${z.prettifyError(parsed.error)}`);
}

export const env: Env = parsed.data;
