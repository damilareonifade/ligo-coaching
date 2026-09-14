/**
 * Fetches one exercise animation and keeps it.
 *
 * WorkoutX serves GIFs from an authenticated endpoint on their API, not a CDN
 * — `/v1/gifs/0032` answers 401 without the key. So the phone cannot load one
 * directly, and it should not: the key would have to travel with the app, and
 * every view would spend a request against the monthly quota.
 *
 * This runs where the key already is, once per exercise, and puts the result
 * in the `exercise-gifs` bucket. After that the animation is served from
 * storage — no quota, no key, and fast enough to open between sets.
 *
 * Called on first view rather than for all 1,400 up front, because the
 * catalogue is a long tail: bench press is fetched once ever and most entries
 * are never opened at all.
 *
 * Deploy: npx supabase functions deploy cache-exercise-gif
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const BUCKET = 'exercise-gifs';
const API = 'https://api.workoutxapp.com/v1';

Deno.serve(async (request) => {
  const key = Deno.env.get('WORKOUTX_KEY');
  if (!key) return json({ error: 'WORKOUTX_KEY is not set' }, 500);

  const { exerciseId } = await request.json().catch(() => ({ exerciseId: null }));
  if (typeof exerciseId !== 'string' || exerciseId.length === 0) {
    return json({ error: 'exerciseId is required' }, 400);
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: exercise, error: lookupError } = await db
    .from('exercises')
    .select('id, external_id, gif_path, source')
    .eq('id', exerciseId)
    .maybeSingle();

  if (lookupError) return json({ error: lookupError.message }, 500);
  if (!exercise) return json({ error: 'no such exercise' }, 404);

  // Already here. Answered rather than refetched — this is the common case
  // once an exercise has been opened by anybody, ever.
  if (exercise.gif_path) return json({ gifPath: exercise.gif_path, cached: true });

  // An exercise somebody typed has no catalogue entry to fetch. Not an error:
  // the screen already says there is no animation for it.
  if (!exercise.external_id || !exercise.source) {
    return json({ gifPath: null, cached: false });
  }

  const source = await fetch(`${API}/gifs/${exercise.external_id}`, {
    headers: { 'X-WorkoutX-Key': key },
  });

  if (!source.ok) {
    // A 429 here is "come back later", not "this exercise has no animation" —
    // so nothing is written and the next viewer tries again.
    return json(
      {
        error: `${source.status} ${source.statusText}`,
        quotaRemaining: source.headers.get('X-Quota-Remaining'),
      },
      source.status === 429 ? 429 : 502,
    );
  }

  const contentType = source.headers.get('Content-Type') ?? 'image/gif';
  const extension = contentType.includes('webp') ? 'webp' : 'gif';
  const path = `${exercise.external_id}.${extension}`;

  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(path, await source.arrayBuffer(), {
      contentType,
      /**
       * A year, and immutable. These bytes never change — the object is named
       * for the WorkoutX exercise id, and an animation of a deadlift is an
       * animation of a deadlift forever.
       *
       * Supabase defaults to `no-cache`, which meant every single view
       * re-downloaded most of a megabyte over the network. That is the
       * opposite of what storing them was for.
       */
      cacheControl: 'public, max-age=31536000, immutable',
      // Two people opening the same exercise at once is a race nobody should
      // lose: the second write overwrites identical bytes.
      upsert: true,
    });

  if (uploadError) return json({ error: uploadError.message }, 500);

  const { error: saveError } = await db
    .from('exercises')
    .update({ gif_path: path })
    .eq('id', exercise.id);

  // The bytes are stored either way; failing to record the path only means
  // the next viewer fetches it again.
  if (saveError) return json({ error: saveError.message }, 500);

  return json({ gifPath: path, cached: false });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
