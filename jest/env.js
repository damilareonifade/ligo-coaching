/**
 * Expo's CLI loads `.env` for `expo start`, but Jest does not — and
 * src/lib/env.ts throws on a missing EXPO_PUBLIC_SUPABASE_* var by design.
 * Supply inert test values so importing any src/api module works under Jest.
 */
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_KEY ??= 'sb_publishable_test';

/**
 * Feature flags. Jest loads no .env, so without these every flag reads as off
 * and any test touching a gated screen would quietly exercise the hidden
 * branch instead of the real one.
 *
 * Set to the shipping state rather than all-on: a test suite that disagrees
 * with the app about which features exist is a suite that passes on screens
 * nobody can reach. `src/lib/__tests__/features.test.ts` holds this honest.
 */
process.env.EXPO_PUBLIC_FEATURE_TRAIN ??= 'true';
process.env.EXPO_PUBLIC_FEATURE_FOOD ??= 'false';
process.env.EXPO_PUBLIC_FEATURE_PROGRESS ??= 'true';
process.env.EXPO_PUBLIC_FEATURE_MESSAGING ??= 'false';
process.env.EXPO_PUBLIC_FEATURE_COMMUNITY ??= 'false';
process.env.EXPO_PUBLIC_FEATURE_CHECK_INS ??= 'true';
process.env.EXPO_PUBLIC_FEATURE_NOTIFICATIONS ??= 'false';
process.env.EXPO_PUBLIC_FEATURE_INTEGRATIONS ??= 'false';
