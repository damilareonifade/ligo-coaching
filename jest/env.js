/**
 * Expo's CLI loads `.env` for `expo start`, but Jest does not — and
 * src/lib/env.ts throws on a missing EXPO_PUBLIC_SUPABASE_* var by design.
 * Supply inert test values so importing any src/api module works under Jest.
 */
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_KEY ??= 'sb_publishable_test';
