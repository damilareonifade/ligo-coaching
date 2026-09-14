import { env } from '@/lib/env';

/**
 * Where a stored exercise animation lives.
 *
 * `exercises.gif_url` holds what WorkoutX gave us, which is a URL on *their*
 * API and answers 401 without the key — it is kept for the importer's
 * reference and must never reach a device. `gif_path` is our own copy in the
 * `exercise-gifs` bucket, and this is how it is addressed.
 *
 * Built in the app rather than stored: the project already knows where its own
 * Supabase lives, and a hostname written into rows is a hostname that is wrong
 * after a migration.
 */
const BUCKET = 'exercise-gifs';

export function exerciseGifUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}
