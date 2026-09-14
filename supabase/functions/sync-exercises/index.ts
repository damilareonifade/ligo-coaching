/**
 * Imports the WorkoutX exercise catalogue into `public.exercises`.
 *
 * Runs here rather than on the phone for three reasons, all of which point the
 * same way — see the migration's header for the long version:
 *
 *   The key never enters the app bundle. It is a function secret and is read
 *   from the environment on each run.
 *
 *   The quota is spent once a month rather than on every keystroke. The picker
 *   searches our own table, so a coach typing "bench" costs nothing.
 *
 *   The catalogue answers offline. A gym basement has no signal and that is
 *   exactly when somebody is adding an exercise.
 *
 * Safe to run twice: every row upserts on (source, external_id), so a repeat
 * run rewrites the same rows rather than duplicating them.
 *
 * Deploy:  npx supabase functions deploy sync-exercises
 * Run:     npx supabase functions invoke sync-exercises
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SOURCE = 'workoutx';
const API = 'https://api.workoutxapp.com/v1';

/**
 * Asked for optimistically. The free plan caps results at 10 and simply
 * returns fewer, which the paging loop handles — so the same code is correct
 * on every tier and costs 14 requests on Basic where it costs 140 on Free.
 */
const PAGE_SIZE = 100;

/**
 * How many requests one invocation will make before handing back.
 *
 * The free plan allows 30 a minute, and the first run learned that the hard
 * way: 31 requests in a few seconds returned 429 at offset 300. Staying under
 * the limit means the full 1,400 takes five minutes of wall clock, which is
 * longer than an Edge Function should hold a connection open for — so the run
 * is chunked instead, and each one reports where to pick up.
 */
const DEFAULT_MAX_REQUESTS = 25;

/** 30 a minute with room to spare, so a slow response cannot tip it over. */
const THROTTLE_MS = 2200;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface WorkoutXExercise {
  readonly id: string;
  readonly name: string;
  readonly gifUrl?: string;
  readonly bodyPart?: string;
  readonly target?: string;
  readonly equipment?: string;
  readonly secondaryMuscles?: readonly string[];
  readonly instructions?: readonly string[];
  readonly difficulty?: string;
  readonly mechanic?: string;
  readonly force?: string;
}

/** The catalogue is a third party's JSON; nothing is trusted to be present. */
function toRow(exercise: WorkoutXExercise) {
  return {
    source: SOURCE,
    external_id: String(exercise.id),
    name: exercise.name.trim(),
    gif_url: exercise.gifUrl ?? null,
    body_part: exercise.bodyPart ?? null,
    target: exercise.target ?? null,
    equipment: exercise.equipment ?? null,
    secondary_muscles: exercise.secondaryMuscles ?? [],
    instructions: exercise.instructions ?? [],
    difficulty: exercise.difficulty ?? null,
    mechanic: exercise.mechanic ?? null,
    force: exercise.force ?? null,
    synced_at: new Date().toISOString(),
    // owner_id stays NULL: an imported exercise belongs to the shared library
    // and to nobody in particular.
  };
}

Deno.serve(async (request) => {
  const key = Deno.env.get('WORKOUTX_KEY');
  if (!key) {
    return json({ error: 'WORKOUTX_KEY is not set' }, 500);
  }

  // The service role, because this writes rows no signed-in user may write —
  // the `exercises_enforce_source` trigger refuses `authenticated` outright.
  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Where to start, and how far to go. Both optional: with no body it resumes
  // from the furthest offset any previous run reached, so re-running is how
  // you finish rather than how you start again.
  const body = await request.json().catch(() => ({}));
  const maxRequests: number = Number(body.maxRequests) || DEFAULT_MAX_REQUESTS;

  let offset: number = Number.isFinite(Number(body.offset))
    ? Number(body.offset)
    : await resumeOffset(db);

  const { data: run } = await db
    .from('catalogue_syncs')
    .insert({ source: SOURCE })
    .select('id')
    .single();

  const startedAt = offset;
  let written = 0;
  let requests = 0;
  let etag: string | null = null;
  let done = false;

  try {
    for (;;) {
      if (requests >= maxRequests) break;

      // Paced rather than raced. The first request of an invocation goes
      // immediately; every one after it waits.
      if (requests > 0) await sleep(THROTTLE_MS);

      const response = await fetch(
        `${API}/exercises?limit=${PAGE_SIZE}&offset=${offset}`,
        { headers: { 'X-WorkoutX-Key': key } },
      );
      requests += 1;

      // A rate limit is not a failure, it is a "not yet". The rows already
      // written stay, the offset is recorded, and the next run continues from
      // here — so this returns rather than throwing.
      if (response.status === 429) break;

      if (!response.ok) {
        throw new Error(
          `${response.status} ${response.statusText} at offset ${offset} — ` +
            `quota remaining ${response.headers.get('X-Quota-Remaining') ?? 'unknown'}`,
        );
      }

      etag = response.headers.get('X-Dataset-ETag') ?? etag;

      const payload = await response.json();
      const page: WorkoutXExercise[] = Array.isArray(payload) ? payload : (payload.data ?? []);
      if (page.length === 0) {
        done = true;
        break;
      }

      const { error } = await db
        .from('exercises')
        .upsert(page.map(toRow), { onConflict: 'source,external_id' });
      if (error) throw new Error(`upsert failed at offset ${offset}: ${error.message}`);

      written += page.length;
      offset += page.length;
    }

    await db
      .from('catalogue_syncs')
      .update({
        finished_at: new Date().toISOString(),
        written,
        requests,
        dataset_etag: etag,
        next_offset: done ? 0 : offset,
        error: done ? null : `paused at offset ${offset}`,
      })
      .eq('id', run?.id);

    return json({ ok: true, from: startedAt, written, requests, nextOffset: offset, done });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);

    // Recorded, not swallowed. A partial import is a real state — the rows
    // that landed are good — and the next run upserts over them.
    await db
      .from('catalogue_syncs')
      .update({
        finished_at: new Date().toISOString(),
        written,
        requests,
        next_offset: offset,
        error: message,
      })
      .eq('id', run?.id);

    return json({ ok: false, written, requests, nextOffset: offset, error: message }, 502);
  }
});

/**
 * The furthest any run has reached.
 *
 * Read from the ledger rather than tracked in the caller, so "run it again"
 * is all anyone has to remember — including a schedule, which has nowhere to
 * keep a number.
 */
async function resumeOffset(db: ReturnType<typeof createClient>): Promise<number> {
  const { data } = await db
    .from('catalogue_syncs')
    .select('next_offset')
    .eq('source', SOURCE)
    .order('next_offset', { ascending: false })
    .limit(1)
    .maybeSingle();

  return Number(data?.next_offset) || 0;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
