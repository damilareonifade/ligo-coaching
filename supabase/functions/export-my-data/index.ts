/**
 * Everything one person has in Ligo, as a file they can take away.
 *
 * A data-portability request, so it is complete rather than convenient: every
 * table keyed to them, with the rows as stored. JSON because the relationships
 * matter — a set belongs to an exercise which belongs to a session, and a
 * folder of flat CSVs loses that silently.
 *
 * Runs as the service role, and is therefore the one place in this codebase
 * where "only their own rows" is not enforced by RLS. Every query below filters
 * on the id taken from the caller's own JWT, never from the request body — a
 * body-supplied id would be an endpoint for reading anybody's history.
 *
 * Deploy: npx supabase functions deploy export-my-data
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const BUCKET = 'exports';

/** An hour. Long enough to save the file, short enough that a leaked link rots. */
const URL_TTL_SECONDS = 60 * 60;

/**
 * One row per logged set, which is what a spreadsheet is actually for.
 *
 * Deliberately not every table flattened into one file: a CSV of sets,
 * check-ins and routines together has no shared columns and is a worse
 * spreadsheet than any of them alone. The complete record is the JSON — this
 * is the half somebody charts.
 */
function toCsv(rows: readonly Record<string, unknown>[]): string {
  const columns = [
    'date',
    'workout',
    'exercise',
    'set',
    'weight_kg',
    'reps',
    'completed',
  ];

  const escape = (value: unknown): string => {
    const text = value === null || value === undefined ? '' : String(value);
    // Quote anything a spreadsheet would otherwise split or swallow.
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };

  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join(',')),
  ].join('\n');
}

Deno.serve(async (request) => {
  const authorization = request.headers.get('Authorization') ?? '';
  const { format = 'json' } = await request.json().catch(() => ({ format: 'json' }));

  // Who is asking, according to their own token. The client below is created
  // with the caller's JWT precisely so `getUser` cannot be talked out of it.
  const asCaller = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authorization } } },
  );

  const { data: auth } = await asCaller.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return json({ error: 'not signed in' }, 401);

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: run } = await db
    .from('data_exports')
    .insert({ client_id: userId })
    .select('id')
    .single();

  try {
    // One query per table rather than a join: the file is a record of what is
    // stored, and flattening it would be an interpretation.
    const [
      profile,
      clientProfile,
      link,
      sessions,
      exercises,
      sets,
      routines,
      blocks,
      measurements,
      health,
      notifications,
    ] = await Promise.all([
      db.from('users').select('*').eq('id', userId),
      db.from('client_profiles').select('*').eq('client_id', userId),
      db.from('coach_clients').select('*').eq('client_id', userId),
      db.from('workout_sessions').select('*').eq('client_id', userId),
      db.from('workout_exercises').select('*, workout_sessions!inner(client_id)')
        .eq('workout_sessions.client_id', userId),
      db.from('workout_sets')
        .select('*, workout_exercises!inner(workout_sessions!inner(client_id))')
        .eq('workout_exercises.workout_sessions.client_id', userId),
      db.from('routine_instances').select('*').eq('client_id', userId),
      db.from('routine_blocks').select('*, routine_instances!inner(client_id)')
        .eq('routine_instances.client_id', userId),
      db.from('body_measurements').select('*').eq('client_id', userId),
      db.from('health_entries').select('*').eq('client_id', userId),
      db.from('notifications').select('*').eq('recipient_id', userId),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      // Said in the file, because somebody reading it a year later will want
      // to know what it is and what it leaves out.
      about:
        'Everything Ligo holds that is keyed to this account. Programs your ' +
        'coach wrote are theirs and are not included; the copies assigned to ' +
        'you are, under routines. Weights are kilograms and lengths ' +
        'centimetres, as stored, whatever units the app was showing you.',
      account: profile.data?.[0] ?? null,
      goals: clientProfile.data?.[0] ?? null,
      coach: link.data ?? [],
      workouts: sessions.data ?? [],
      workoutExercises: exercises.data ?? [],
      sets: sets.data ?? [],
      routines: routines.data ?? [],
      routineBlocks: blocks.data ?? [],
      checkIns: measurements.data ?? [],
      healthProfile: health.data ?? [],
      notifications: notifications.data ?? [],
    };

    const wantsCsv = format === 'csv';

    // The CSV is built from the same rows the JSON carries, so the two can
    // never disagree about what was logged.
    const csvRows = (sets.data ?? []).map((set: Record<string, unknown>) => {
      const exercise = (exercises.data ?? []).find(
        (e: Record<string, unknown>) => e.id === set.workout_exercise_id,
      );
      const session = (sessions.data ?? []).find(
        (s: Record<string, unknown>) => s.id === exercise?.workout_session_id,
      );
      return {
        date: session?.finished_at ?? session?.started_at ?? '',
        workout: session?.title ?? '',
        exercise: exercise?.name ?? '',
        set: set.n,
        weight_kg: set.weight_kg,
        reps: set.reps,
        completed: set.completed,
      };
    });

    const body = new TextEncoder().encode(
      wantsCsv ? toCsv(csvRows) : JSON.stringify(payload, null, 2),
    );
    // Foldered by user so one person's exports cannot be listed by guessing
    // another's, even with the bucket's own policies aside.
    const path = `${userId}/ligo-export-${Date.now()}.${wantsCsv ? 'csv' : 'json'}`;

    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(path, body, {
        contentType: wantsCsv ? 'text/csv' : 'application/json',
        upsert: false,
      });
    if (uploadError) throw new Error(uploadError.message);

    const { data: signed, error: signError } = await db.storage
      .from(BUCKET)
      .createSignedUrl(path, URL_TTL_SECONDS);
    if (signError) throw new Error(signError.message);

    await db
      .from('data_exports')
      .update({
        finished_at: new Date().toISOString(),
        path,
        bytes: body.byteLength,
        format: wantsCsv ? 'csv' : 'json',
      })
      .eq('id', run?.id);

    return json({ url: signed.signedUrl, bytes: body.byteLength, expiresIn: URL_TTL_SECONDS });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);

    await db
      .from('data_exports')
      .update({ finished_at: new Date().toISOString(), error: message })
      .eq('id', run?.id);

    return json({ error: message }, 502);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
