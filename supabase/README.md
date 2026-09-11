# Database

The schema lives in `migrations/`, applied in filename order. Nothing in the
app creates or alters tables — see **Why the app cannot migrate** below.

## Layout

| Table | Purpose |
|---|---|
| `public.users` | Profile mirror of `auth.users`. Created by trigger on signup. Holds `role`, which decides which half of the app renders. |
| `public.sessions` | App-level device sessions — which devices are signed in, when each was last seen, where to push. Not a copy of `auth.sessions`. |
| `public.cache` | Per-user key/value cache with an optional TTL. Never a source of truth. |
| `public.password_reset_requests` | Audit trail and rate-limit ledger for resets. **No tokens** — GoTrue owns those. |
| `public.coach_clients` | Roster membership. The authority on which coach may read which client. |

Two things a Laravel-shaped starter schema would include are deliberately
absent:

- **A password-reset token table.** GoTrue already issues, hashes, expires and
  single-uses reset tokens. A second store would be a worse copy whose failure
  mode is a link that still works after the real one was spent. The app calls
  `resetPasswordForEmail`; the ledger only records that it happened.
- **A `migrations` table.** The Supabase CLI keeps its own ledger in
  `supabase_migrations.schema_migrations`, which is not exposed through the
  Data API. Adding one in `public` would put migration state within reach of
  the anon key.

## Applying migrations

Requires the CLI and either the database password or an access token — neither
of which is in this repo, and neither of which the app ships with.

```sh
npx supabase link --project-ref tblujcawpwvedllowuuy   # once, interactive
npx supabase db push                                   # applies pending migrations
npx supabase migration list                            # local vs remote state
```

New migration:

```sh
npx supabase migration new add_programs
./scripts/verify-schema.sh      # applies to a throwaway local Postgres and asserts behaviour
./scripts/gen-types.sh          # regenerates src/api/database.types.ts
```

`scripts/verify-schema.sh` exists because `supabase db reset` needs the Docker
daemon; it only needs a running Postgres, and it never touches the remote
project. The checks it runs are in `verify/01_checks.sql`, and the stand-in for
Supabase's own objects (`auth.users`, `auth.uid()`, the API roles) is in
`verify/00_stub_supabase.sql`.

## Why the app cannot migrate

The publishable key in `.env` can only assume `anon` and `authenticated`.
Neither role:

- **owns any object** — so `ALTER`/`DROP` on these tables is refused;
- **holds `CREATE` on `public`** — revoked explicitly in the first migration,
  so no new tables either;
- **has more than the listed grants** — each migration revokes the broad
  defaults Supabase hands out and grants back only what the app performs.
  A missing RLS policy therefore fails closed instead of open.

`verify/01_checks.sql` asserts this: a signed-in user attempting
`create table` gets `permission denied for schema public`.

Migrations run as the table owner, through the CLI, from a machine holding
credentials that never enter the bundle.

## Scalability notes

- **Index shape follows the query.** Composite primary keys on `cache`
  (`user_id, key`) and `coach_clients` (`coach_id, client_id`) *are* the
  lookup index, so those reads need no second structure.
- **Partial indexes where the predicate is the point** — `users_coach_idx`
  carries only coaches, `sessions_push_idx` only live rows with a push token,
  `coach_clients_client_active_idx` only active links. They stay small as the
  table grows because most rows never qualify.
- **`(select auth.uid())`, not `auth.uid()`, in every policy.** Wrapped in a
  scalar subquery, Postgres hoists the call into an InitPlan and evaluates it
  once per statement instead of once per candidate row.
- **Nothing grows without bound.** `purge_expired_cache()` and
  `purge_old_password_reset_requests()` reclaim their tables. Schedule them
  once pg_cron is enabled (Dashboard → Database → Extensions):

  ```sql
  select cron.schedule('purge-cache', '*/15 * * * *', 'select public.purge_expired_cache()');
  select cron.schedule('purge-resets', '0 4 * * *',  'select public.purge_old_password_reset_requests()');
  ```

  Both are operator-only: execute is revoked from `anon` and `authenticated`,
  because a client that could sweep the cache could evict every user's rows.
- **Timestamps are `timestamptz`** throughout, and every mutable table has a
  trigger maintaining `updated_at` (or `last_seen_at`) rather than trusting
  the client's clock.
